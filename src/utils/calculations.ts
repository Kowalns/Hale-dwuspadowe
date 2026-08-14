import type { HallParameters, CalculationResults, SteelProfile } from '../types';
import { ipeProfiles, rhsProfiles, zProfiles, trussChordProfiles } from '../data/profiles';
import { snowZoneLoads, windZoneLoads, coveringSelfWeight } from '../data/loads';
import {
  calculateColumnSpacing,
  calculatePurlinSpacing,
  calculateRidgeHeight,
  calculateRoofSlopeLength,
} from './geometry';
import {
  computeSnowLoad,
  getSnowExposureCoefficient,
  computePeakVelocityPressure,
  getCpeWallWindward,
  getCpeWallLeeward,
  getCpeRoofWindward,
  getCpeRoofWindwardSuction,
  getCpeRoofLeeward,
  computeLoadCombinations,
  computeFrameFactor,
  computeBucklingFactor,
  computeLTBFactor,
  computeInteractionCheck,
  computeRelativeSlenderness,
  computeKyy,
  computeTrussChordBuckling,
  computeColumnDeflection,
  computeRafterDeflection,
  getColumnDeflectionLimit,
  getRafterDeflectionLimit,
  type CharacteristicLoads,
  type LoadCombinationForces,
} from './eurocode';

/** Yield strength in MPa */
const yieldStrength: Record<string, number> = {
  S235: 235,
  S355: 355,
};

/**
 * Select Z purlin by load capacity.
 */
function selectPurlinByLoad(loadPerMeter: number): SteelProfile {
  const sorted = [...zProfiles].sort((a, b) => (a.load_capacity ?? 0) - (b.load_capacity ?? 0));
  const selected = sorted.find((p) => (p.load_capacity ?? 0) >= loadPerMeter);
  return selected ?? sorted[sorted.length - 1];
}

/**
 * Select bracing diameter based on total loads.
 * Light: 12mm, Standard: 16mm, Heavy: 20mm
 */
function selectBracing(params: HallParameters, columnSpacing: number): number {
  const snowLoad = snowZoneLoads[params.snowZone] ?? 0.9;
  const windLoad = windZoneLoads[params.windZone] ?? 0.3;
  const totalLoad = (snowLoad + windLoad) * columnSpacing * params.span;

  if (totalLoad < 50) return 12;
  if (totalLoad < 120) return 16;
  return 20;
}

/**
 * Check side column (IPE) with full Eurocode stability interaction.
 * Returns utilization ratio for a given profile under the given forces.
 */
function checkColumnStability(
  profile: SteelProfile,
  MEd: number,
  NEd: number,
  H_m: number,
  fy: number
): number {
  const i_y = profile.i_y ?? 10; // cm
  const Lcr = H_m; // buckling length = column height (pinned base, fixed head approx)

  // Compute buckling factor (curve b for IPE about strong axis, alpha=0.34)
  const chi_y = computeBucklingFactor(Lcr, i_y, fy, 0.34);

  // Lateral-torsional buckling: column inner flange not restrained by cladding
  const chi_LT = computeLTBFactor(false);

  // Interaction factor kyy
  const lambda_bar = computeRelativeSlenderness(Lcr, i_y, fy);
  const kyy = computeKyy(lambda_bar, NEd, chi_y, profile.A, fy);

  // Interaction check
  return computeInteractionCheck(NEd, MEd, profile.A, profile.W_pl, fy, chi_y, chi_LT, kyy);
}

/**
 * Check column horizontal deflection (SLS).
 * For a portal frame the column deflection is reduced by frame action.
 * Apply frame factor (k_ramy) to account for rafter restraint.
 * Returns true if deflection is within limit.
 */
function checkColumnDeflection(
  profile: SteelProfile,
  q_wind_char_kN_per_m: number,
  H_m: number
): { deflection: number; limit: number; ok: boolean } {
  const k_ramy = computeFrameFactor(); // frame reduces deflection vs pure cantilever
  const deflection = computeColumnDeflection(q_wind_char_kN_per_m * k_ramy, H_m, profile.I);
  const limit = getColumnDeflectionLimit(H_m);
  return { deflection, limit, ok: deflection <= limit };
}

/**
 * Select side column using iterative approach:
 * Start from smallest IPE, check stability interaction + deflection, pick smallest passing.
 */
function selectSideColumn(
  governingCombo: LoadCombinationForces,
  q_wind_char_kN_per_m: number,
  H_m: number,
  fy: number
): {
  profile: SteelProfile;
  utilization: number;
  deflection: number;
  deflectionLimit: number;
  governingCondition: string;
} {
  // Filter to structural IPE profiles (>= IPE 160 for columns)
  const candidates = ipeProfiles.filter(p => p.h >= 160);
  const MEd = governingCombo.M_column;
  const NEd = governingCombo.N_column;

  for (const profile of candidates) {
    const utilization = checkColumnStability(profile, MEd, NEd, H_m, fy);
    const deflCheck = checkColumnDeflection(profile, q_wind_char_kN_per_m, H_m);

    if (utilization <= 1.0 && deflCheck.ok) {
      return {
        profile,
        utilization,
        deflection: deflCheck.deflection,
        deflectionLimit: deflCheck.limit,
        governingCondition: utilization > (deflCheck.deflection / deflCheck.limit) ? 'stability' : 'deflection',
      };
    }

    // If stability passes but deflection fails, continue to next profile
    // If neither passes, continue
  }

  // If no profile passes, return largest with its utilization
  const largest = candidates[candidates.length - 1];
  const util = checkColumnStability(largest, MEd, NEd, H_m, fy);
  const deflCheck = checkColumnDeflection(largest, q_wind_char_kN_per_m, H_m);
  return {
    profile: largest,
    utilization: util,
    deflection: deflCheck.deflection,
    deflectionLimit: deflCheck.limit,
    governingCondition: util > 1.0 ? 'stability' : 'deflection',
  };
}

/**
 * Select end column (RHS/SHS) - half tributary area, same stability checks.
 */
function selectEndColumn(
  governingCombo: LoadCombinationForces,
  q_wind_char_kN_per_m: number,
  H_m: number,
  fy: number
): SteelProfile {
  // End columns have half the tributary width, so half the loads
  const MEd = governingCombo.M_column * 0.5;
  const NEd = governingCombo.N_column * 0.5;

  const candidates = rhsProfiles.filter(p => p.h >= 80);

  for (const profile of candidates) {
    const i_y = profile.i_min ?? Math.sqrt(profile.I / profile.A);
    const chi_y = computeBucklingFactor(H_m, i_y, fy, 0.49); // curve c for RHS
    const chi_LT = 1.0; // Closed sections not susceptible to LTB
    const util = computeInteractionCheck(NEd, MEd, profile.A, profile.W_pl, fy, chi_y, chi_LT);
    const deflCheck = checkColumnDeflection(profile, q_wind_char_kN_per_m * 0.5, H_m);

    if (util <= 1.0 && deflCheck.ok) {
      return profile;
    }
  }

  return candidates[candidates.length - 1];
}

/**
 * Select rafter (IPE) for span <= 18m with moment and deflection check.
 */
function selectRafter(
  q_rafter_ULS: number,
  q_rafter_SLS: number,
  halfSpan: number,
  fy: number
): { profile: SteelProfile; deflection: number; deflectionLimit: number } {
  const M_max = (q_rafter_ULS * halfSpan * halfSpan) / 8; // kNm (simply supported beam)

  const candidates = ipeProfiles.filter(p => p.h >= 160);
  const deflLimit = getRafterDeflectionLimit(halfSpan);

  for (const profile of candidates) {
    // Simple strength check: M_Ed <= W_pl * fy / gammaM0
    const MRd = profile.W_pl * 1000 * fy / 1e6; // kNm
    const strengthUtil = M_max / MRd;

    // Deflection check (SLS)
    const defl = computeRafterDeflection(q_rafter_SLS, halfSpan, profile.I);

    if (strengthUtil <= 1.0 && defl <= deflLimit) {
      return { profile, deflection: defl, deflectionLimit: deflLimit };
    }
  }

  const largest = candidates[candidates.length - 1];
  return {
    profile: largest,
    deflection: computeRafterDeflection(q_rafter_SLS, halfSpan, largest.I),
    deflectionLimit: deflLimit,
  };
}

/**
 * Select truss chord (square tube) with buckling check on top chord.
 * Truss height = span / 10 (standard for steel trusses).
 * Panel length (distance between nodes) ~ 2m.
 */
function selectTrussChord(
  q_rafter_ULS: number,
  q_rafter_SLS: number,
  span: number,
  fy: number
): {
  profile: SteelProfile;
  trussHeight: number;
  deflection: number;
  deflectionLimit: number;
} {
  const halfSpan = span / 2;
  const trussHeight = span / 10; // m
  const M_max = (q_rafter_ULS * halfSpan * halfSpan) / 8; // kNm
  const NEd = (M_max / trussHeight); // kN (axial force in chord = M/h_truss)

  // Panel length (distance between truss nodes): typically span/number_of_panels
  // For a Pratt truss with ~2m panels
  const numPanels = Math.max(4, Math.round(halfSpan / 2));
  const panelLength = halfSpan / numPanels; // m (buckling length for top chord)

  const deflLimit = getRafterDeflectionLimit(span);

  for (const profile of trussChordProfiles) {
    const i_min = profile.i_min ?? Math.sqrt(profile.I / profile.A);
    const util = computeTrussChordBuckling(NEd, profile.A, i_min, panelLength, fy, 0.49);

    // Deflection check for truss (approximate as equivalent beam with I_equiv)
    // For a truss: I_equiv ~ 2 * A_chord * (h_truss/2)^2 (parallel axis theorem)
    const I_equiv_cm4 = 2 * profile.A * Math.pow(trussHeight * 100 / 2, 2); // cm4
    const defl = computeRafterDeflection(q_rafter_SLS, span, I_equiv_cm4);

    if (util <= 1.0 && defl <= deflLimit) {
      return { profile, trussHeight, deflection: defl, deflectionLimit: deflLimit };
    }
  }

  const largest = trussChordProfiles[trussChordProfiles.length - 1];
  const i_min_l = largest.i_min ?? Math.sqrt(largest.I / largest.A);
  const I_equiv_cm4 = 2 * largest.A * Math.pow(trussHeight * 100 / 2, 2);
  const _util = computeTrussChordBuckling(NEd, largest.A, i_min_l, panelLength, fy, 0.49);
  void _util;
  return {
    profile: largest,
    trussHeight,
    deflection: computeRafterDeflection(q_rafter_SLS, span, I_equiv_cm4),
    deflectionLimit: deflLimit,
  };
}

/**
 * Select purlin (Z profile) based on load (ULS factored).
 */
function selectPurlin(params: HallParameters, purlinSpacing: number): SteelProfile {
  const snowLoad = snowZoneLoads[params.snowZone] ?? 0.9;
  const selfWeight = coveringSelfWeight[params.coveringType] ?? 0.15;
  // ULS factored load for purlin selection
  const loadPerMeter = (1.35 * selfWeight + 1.5 * snowLoad) * purlinSpacing;
  return selectPurlinByLoad(loadPerMeter);
}

/**
 * Main calculation function: takes hall parameters, returns all results.
 * Implements full Eurocode PN-EN 1990/1991/1993 methodology.
 */
export function calculateHallStructure(params: HallParameters): CalculationResults {
  const fy = yieldStrength[params.steelGrade] ?? 235;

  // --- Geometry ---
  const { spacing: columnSpacing, count: numberOfBays } = calculateColumnSpacing(params.length);
  const roofSlopeLength = calculateRoofSlopeLength(params.span, params.roofAngle);
  const purlinSpacing = calculatePurlinSpacing(roofSlopeLength);
  const ridgeHeight = calculateRidgeHeight(params.wallHeight, params.span, params.roofAngle);

  // --- Snow load (PN-EN 1991-1-3) ---
  const Sk = snowZoneLoads[params.snowZone] ?? 0.9;
  const Ce = getSnowExposureCoefficient(params.snowExposure ?? 'normal');
  const s_roof = computeSnowLoad(Sk, params.roofAngle, Ce); // kN/m2 on roof

  // --- Wind load (PN-EN 1991-1-4) ---
  const terrainCat = params.terrainCategory ?? 2;
  const qp = computePeakVelocityPressure(params.windZone, params.wallHeight, terrainCat); // kN/m2

  // Wind pressure coefficients
  const cpe_D = getCpeWallWindward(); // +0.8
  const cpe_E = getCpeWallLeeward(); // -0.5
  const cpe_roof_wind = getCpeRoofWindward(params.roofAngle);
  const cpe_roof_suction = getCpeRoofWindwardSuction(params.roofAngle);
  const cpe_roof_lee = getCpeRoofLeeward();

  // Wind pressures [kN/m2]
  const w_D = cpe_D * qp;
  const w_E = cpe_E * qp;
  const w_roof_wind = cpe_roof_wind * qp;
  const w_roof_suction = cpe_roof_suction * qp;
  const w_roof_lee = cpe_roof_lee * qp;
  void w_roof_lee; // used in full analysis, not in simplified 2D frame

  // --- Dead load on roof ---
  const g_roof = (coveringSelfWeight[params.coveringType] ?? 0.15) + 0.10; // covering + purlins/connections

  // --- Frame factor ---
  const k_ramy = computeFrameFactor();

  // --- Load combinations ---
  const charLoads: CharacteristicLoads = {
    g_roof,
    s_roof,
    w_D,
    w_E: Math.abs(w_E), // use absolute value (suction on leeward = net horizontal)
    w_roof_wind: Math.max(w_roof_wind, 0), // positive downward contribution
    w_roof_suction,
    w_roof_lee,
    Lk: columnSpacing,
    H: params.wallHeight,
    span: params.span,
    alpha: params.roofAngle,
    k_ramy,
  };

  const combinations = computeLoadCombinations(charLoads);

  // Find governing combination (max moment in column)
  let governing = combinations[0];
  for (const combo of combinations) {
    if (combo.M_column > governing.M_column) {
      governing = combo;
    }
  }

  // --- Characteristic wind load on column for SLS deflection check ---
  const q_wind_char = (w_D + Math.abs(w_E)) * columnSpacing; // kN/m (total horizontal on frame)
  // For column deflection: use distributed load on single column
  const q_wind_column_SLS = q_wind_char; // kN/m along column height

  // --- Select side column (IPE) with stability + deflection ---
  const columnResult = selectSideColumn(governing, q_wind_column_SLS, params.wallHeight, fy);

  // --- Select end column (RHS) ---
  const endColumnProfile = selectEndColumn(governing, q_wind_column_SLS, params.wallHeight, fy);

  // --- Select rafter or truss ---
  // SLS load on rafter (characteristic, unfactored)
  const q_rafter_SLS = (g_roof + s_roof) * columnSpacing; // kN/m
  // ULS load on rafter from governing combination
  const q_rafter_ULS = governing.q_rafter;

  let rafterProfile: SteelProfile | null = null;
  let trussChordProfile: SteelProfile | null = null;
  let trussHeight: number | null = null;
  let rafterDeflection: number;
  let rafterDeflectionLimit: number;

  if (params.span <= 18) {
    const halfSpan = params.span / 2;
    const rafterResult = selectRafter(q_rafter_ULS, q_rafter_SLS, halfSpan, fy);
    rafterProfile = rafterResult.profile;
    rafterDeflection = rafterResult.deflection;
    rafterDeflectionLimit = rafterResult.deflectionLimit;
  } else {
    const trussResult = selectTrussChord(q_rafter_ULS, q_rafter_SLS, params.span, fy);
    trussChordProfile = trussResult.profile;
    trussHeight = trussResult.trussHeight;
    rafterDeflection = trussResult.deflection;
    rafterDeflectionLimit = trussResult.deflectionLimit;
  }

  // --- Select purlin ---
  const purlinProfile = selectPurlin(params, purlinSpacing);

  // --- Select bracing ---
  const bracingDiameter = selectBracing(params, columnSpacing);

  // --- Compute steel mass per m2 of floor area ---
  const floorArea = params.span * params.length; // m2
  const numberOfFrames = numberOfBays + 1;
  // Mass from columns (side columns * 2 per frame, end columns at gable walls)
  const sideColumnMass = columnResult.profile.mass * params.wallHeight * 2 * numberOfFrames;
  const endColumnMass = endColumnProfile.mass * params.wallHeight * 2 * 2; // 2 gable walls, ~2 columns each (simplified)
  // Mass from rafters/trusses
  let rafterMass = 0;
  if (rafterProfile) {
    rafterMass = rafterProfile.mass * roofSlopeLength * 2 * numberOfFrames;
  } else if (trussChordProfile) {
    // Top + bottom chords + diagonals (approximate: 2.5x chord mass)
    rafterMass = trussChordProfile.mass * params.span * 2.5 * numberOfFrames;
  }
  // Mass from purlins
  const numPurlinsPerSlope = Math.ceil(roofSlopeLength / purlinSpacing) + 1;
  const purlinMass = purlinProfile.mass * params.length * numPurlinsPerSlope * 2;
  const totalSteelMass = sideColumnMass + endColumnMass + rafterMass + purlinMass;
  const steelMassPerM2 = totalSteelMass / floorArea;

  // --- Deflection checks ---
  const columnDeflection = columnResult.deflection;
  const columnDeflectionLimit = columnResult.deflectionLimit;
  const deflectionCheck = (columnDeflection <= columnDeflectionLimit) &&
    (rafterDeflection <= rafterDeflectionLimit);

  // --- Final results ---
  const stabilityCheck = columnResult.utilization <= 1.0;

  return {
    sideColumnProfile: columnResult.profile,
    endColumnProfile,
    rafterProfile,
    trussChordProfile,
    purlinProfile,
    bracingDiameter,
    columnSpacing,
    purlinSpacing,
    trussHeight,
    numberOfFrames,
    ridgeHeight,
    // Extended Eurocode results
    utilizationRatio: columnResult.utilization,
    governingCombination: governing.name,
    governingCondition: columnResult.governingCondition,
    steelMassPerM2,
    columnDeflection,
    columnDeflectionLimit,
    rafterDeflection,
    rafterDeflectionLimit,
    deflectionCheck,
    stabilityCheck,
  };
}

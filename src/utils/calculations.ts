import type { HallParameters, CalculationResults, SteelProfile, ProfileOverrides, RafterType, ConnectionPlateResults, ConnectionPlateInfo } from '../types';
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
  computeMcr,
  computeIz,
  computeInteractionCheck,
  computeRelativeSlenderness,
  computeKyy,
  computeTrussChordBuckling,
  computeColumnDeflection,
  computeRafterDeflection,
  getColumnDeflectionLimit,
  getRafterDeflectionLimit,
  GAMMA_M1,
  type CharacteristicLoads,
  type LoadCombinationForces,
} from './eurocode';

/** Yield strength in MPa */
const yieldStrength: Record<string, number> = {
  S235: 235,
  S355: 355,
};

/**
 * Default rafter inertia assumption for initial frame factor calculation.
 * Uses IPE 300 (I = 8356 cm4) as a reasonable starting assumption for rafters.
 */
const DEFAULT_RAFTER_I = 8356; // cm4 (IPE 300)

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
 * Compute chi_LT for a given IPE profile and unbraced length.
 * Uses Mcr-based approach per EN 1993-1-1 clause 6.3.2.3.
 *
 * For columns in portal frames, C1 depends on moment distribution:
 * - Triangular moment (pinned base, moment at head): C1 ~ 1.77
 * - Uniform moment: C1 = 1.0
 * For portal frame columns with pinned base and moment at head, C1 = 1.77
 */
function computeColumnChiLT(profile: SteelProfile, Lcr_m: number, fy: number): number {
  const h = profile.h; // mm
  const b = profile.b; // mm
  const tf = profile.tf ?? 10; // mm
  const tw = profile.tw ?? 7; // mm

  // Get It and Iw from profile, or use approximations
  let It_cm4 = profile.It;
  let Iw_x1000_cm6 = profile.Iw;

  if (It_cm4 === undefined) {
    // Approximation: It ~ sum(b*t^3/3) for thin-walled open sections
    const hw = h - 2 * tf;
    It_cm4 = (2 * b * Math.pow(tf, 3) / 3 + hw * Math.pow(tw, 3) / 3) / 1e4; // mm4 -> cm4
  }

  if (Iw_x1000_cm6 === undefined) {
    // Approximation: Iw ~ Iz * (h - tf)^2 / 4
    const Iz_cm4 = computeIz(b, tf, h, tw);
    const Iw_cm6 = Iz_cm4 * Math.pow((h - tf) / 10, 2) / 4; // cm4 * cm2 = cm6
    Iw_x1000_cm6 = Iw_cm6 / 1000; // store as x10^3
  }

  // Compute Iz (weak axis)
  const Iz_cm4 = computeIz(b, tf, h, tw);

  // C1 = 1.77 for triangular moment distribution (portal frame column: pinned base, moment at head)
  const C1 = 1.77;

  const Mcr = computeMcr(Lcr_m, Iz_cm4, It_cm4, Iw_x1000_cm6, C1);
  const chi_LT = computeLTBFactor(profile.W_pl, fy, Mcr, h, b);

  return chi_LT;
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
  const Lcr = H_m; // buckling length = column height (pinned base, braced frame)

  // Compute buckling factor (curve b for IPE about strong axis, alpha=0.34)
  const chi_y = computeBucklingFactor(Lcr, i_y, fy, 0.34);

  // Lateral-torsional buckling: compute chi_LT based on Mcr
  const chi_LT = computeColumnChiLT(profile, Lcr, fy);

  // Interaction factor kyy
  const lambda_bar = computeRelativeSlenderness(Lcr, i_y, fy);
  const kyy = computeKyy(lambda_bar, NEd, chi_y, profile.A, fy);

  // Interaction check with gamma_M1 = 1.1
  return computeInteractionCheck(NEd, MEd, profile.A, profile.W_pl, fy, chi_y, chi_LT, kyy, GAMMA_M1);
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
  H_m: number,
  k_ramy: number
): { deflection: number; limit: number; ok: boolean } {
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
  fy: number,
  k_ramy: number
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
    const deflCheck = checkColumnDeflection(profile, q_wind_char_kN_per_m, H_m, k_ramy);

    if (utilization <= 1.0 && deflCheck.ok) {
      return {
        profile,
        utilization,
        deflection: deflCheck.deflection,
        deflectionLimit: deflCheck.limit,
        governingCondition: utilization > (deflCheck.deflection / deflCheck.limit) ? 'stability' : 'deflection',
      };
    }
  }

  // If no profile passes, return largest with its utilization
  const largest = candidates[candidates.length - 1];
  const util = checkColumnStability(largest, MEd, NEd, H_m, fy);
  const deflCheck = checkColumnDeflection(largest, q_wind_char_kN_per_m, H_m, k_ramy);
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
  fy: number,
  k_ramy: number
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
    const deflCheck = checkColumnDeflection(profile, q_wind_char_kN_per_m * 0.5, H_m, k_ramy);

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
  const I_equiv_cm4 = 2 * largest.A * Math.pow(trussHeight * 100 / 2, 2);
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
 * Calculate connection plate dimensions, thickness, bolts, count, and mass.
 */
function calculateConnectionPlates(
  sideColumnProfile: SteelProfile,
  rafterProfile: SteelProfile | null,
  trussChordProfile: SteelProfile | null,
  numberOfFrames: number,
  endColumnCount: number,
  span: number
): ConnectionPlateResults {
  // --- Base plate ---
  const basePlateWidth = sideColumnProfile.h + 100; // mm
  const basePlateHeight = sideColumnProfile.b + 100; // mm
  let basePlateThickness: number;
  if (sideColumnProfile.h >= 400) {
    basePlateThickness = 20;
  } else if (sideColumnProfile.h >= 300) {
    basePlateThickness = 18;
  } else if (sideColumnProfile.h >= 220) {
    basePlateThickness = 15;
  } else {
    basePlateThickness = 12;
  }
  const basePlateAnchors = sideColumnProfile.h <= 270 ? '4x M20' : '4x M24';
  const basePlateCount = numberOfFrames * 2 + endColumnCount;
  const basePlateMassPerPlate = (basePlateWidth * basePlateHeight * basePlateThickness) / 1e9 * 7850;

  const basePlate: ConnectionPlateInfo = {
    width: basePlateWidth,
    height: basePlateHeight,
    thickness: basePlateThickness,
    mass: basePlateMassPerPlate,
    count: basePlateCount,
    bolts: basePlateAnchors,
  };

  // --- End plate (column-to-rafter connection) ---
  const endPlateWidth = sideColumnProfile.b + 40; // mm
  const rafterH = rafterProfile?.h ?? trussChordProfile?.h ?? 200;
  const endPlateHeight = rafterH + 60; // mm
  let endPlateThickness: number;
  if (span <= 15) {
    endPlateThickness = 10;
  } else if (span <= 20) {
    endPlateThickness = 12;
  } else {
    endPlateThickness = 16;
  }
  const endPlateBolts = span <= 15 ? '4x M16 kl.8.8' : '6x M20 kl.8.8';
  const endPlateCount = 2 * numberOfFrames;
  const endPlateMassPerPlate = (endPlateWidth * endPlateHeight * endPlateThickness) / 1e9 * 7850;

  const endPlate: ConnectionPlateInfo = {
    width: endPlateWidth,
    height: endPlateHeight,
    thickness: endPlateThickness,
    mass: endPlateMassPerPlate,
    count: endPlateCount,
    bolts: endPlateBolts,
  };

  // --- Ridge plate ---
  const rafterB = rafterProfile?.b ?? trussChordProfile?.b ?? 100;
  const ridgePlateWidth = rafterB + 30; // mm
  const ridgePlateRafterH = rafterProfile?.h ?? trussChordProfile?.h ?? 200;
  const ridgePlateHeight = Math.round(ridgePlateRafterH * 0.7); // mm
  const ridgePlateThickness = 10; // mm
  const ridgePlateBolts = '4x M16';
  const ridgePlateCount = numberOfFrames;
  const ridgePlateMassPerPlate = (ridgePlateWidth * ridgePlateHeight * ridgePlateThickness) / 1e9 * 7850;

  const ridgePlate: ConnectionPlateInfo = {
    width: ridgePlateWidth,
    height: ridgePlateHeight,
    thickness: ridgePlateThickness,
    mass: ridgePlateMassPerPlate,
    count: ridgePlateCount,
    bolts: ridgePlateBolts,
  };

  // --- Total mass ---
  const totalMass =
    basePlate.mass * basePlate.count +
    endPlate.mass * endPlate.count +
    ridgePlate.mass * ridgePlate.count;

  return { basePlate, endPlate, ridgePlate, totalMass };
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

  // --- Frame factor (k_ramy) ---
  // Compute frame factor based on stiffness ratio: I_rafter / I_column
  // Use default rafter I (IPE 300) for initial estimate; will be refined iteratively
  const halfSpan = params.span / 2;
  const k_ramy = computeFrameFactor(
    DEFAULT_RAFTER_I,   // I_rafter (IPE 300 as default assumption)
    halfSpan,           // L_rafter (half-span)
    DEFAULT_RAFTER_I,   // I_column (start with same assumption, will be overridden by selection)
    params.wallHeight   // H_column
  );

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
  const columnResult = selectSideColumn(governing, q_wind_column_SLS, params.wallHeight, fy, k_ramy);

  // --- Refine frame factor with actual selected column ---
  // Recompute k_ramy with the actual column I, then re-check if a different column is needed
  const k_ramy_refined = computeFrameFactor(
    DEFAULT_RAFTER_I,
    halfSpan,
    columnResult.profile.I,
    params.wallHeight
  );

  // If k_ramy changed significantly, recompute combinations and re-select
  let finalColumnResult = columnResult;
  let finalGoverning = governing;
  let finalKramy = k_ramy;

  if (Math.abs(k_ramy_refined - k_ramy) > 0.05) {
    finalKramy = k_ramy_refined;
    const charLoadsRefined: CharacteristicLoads = { ...charLoads, k_ramy: k_ramy_refined };
    const combinationsRefined = computeLoadCombinations(charLoadsRefined);

    let governingRefined = combinationsRefined[0];
    for (const combo of combinationsRefined) {
      if (combo.M_column > governingRefined.M_column) {
        governingRefined = combo;
      }
    }
    finalGoverning = governingRefined;

    finalColumnResult = selectSideColumn(finalGoverning, q_wind_column_SLS, params.wallHeight, fy, k_ramy_refined);
  } else {
    finalKramy = k_ramy;
  }

  // --- Select end column (RHS) ---
  const endColumnProfile = selectEndColumn(finalGoverning, q_wind_column_SLS, params.wallHeight, fy, finalKramy);

  // --- Select rafter or truss ---
  // SLS load on rafter (characteristic, unfactored)
  const q_rafter_SLS = (g_roof + s_roof) * columnSpacing; // kN/m
  // ULS load on rafter from governing combination
  const q_rafter_ULS = finalGoverning.q_rafter;

  let rafterProfile: SteelProfile | null = null;
  let trussChordProfile: SteelProfile | null = null;
  let trussHeight: number | null = null;
  let rafterDeflection: number;
  let rafterDeflectionLimit: number;

  if (params.span <= 18) {
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
  const sideColumnMass = finalColumnResult.profile.mass * params.wallHeight * 2 * numberOfFrames;
  const endColumnCount = 2 * 2; // 2 gable walls, ~2 columns each (simplified)
  const endColumnMass = endColumnProfile.mass * params.wallHeight * endColumnCount;
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

  // --- Connection plates ---
  const connectionPlates = calculateConnectionPlates(
    finalColumnResult.profile,
    rafterProfile,
    trussChordProfile,
    numberOfFrames,
    endColumnCount,
    params.span
  );

  const totalSteelMass = sideColumnMass + endColumnMass + rafterMass + purlinMass + connectionPlates.totalMass;
  const steelMassPerM2 = totalSteelMass / floorArea;

  // --- Deflection checks ---
  const columnDeflection = finalColumnResult.deflection;
  const columnDeflectionLimit = finalColumnResult.deflectionLimit;
  const deflectionCheck = (columnDeflection <= columnDeflectionLimit) &&
    (rafterDeflection <= rafterDeflectionLimit);

  // --- Final results ---
  const stabilityCheck = finalColumnResult.utilization <= 1.0;

  return {
    sideColumnProfile: finalColumnResult.profile,
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
    utilizationRatio: finalColumnResult.utilization,
    governingCombination: finalGoverning.name,
    governingCondition: finalColumnResult.governingCondition,
    steelMassPerM2,
    columnDeflection,
    columnDeflectionLimit,
    rafterDeflection,
    rafterDeflectionLimit,
    deflectionCheck,
    stabilityCheck,
    // Connection plates
    connectionPlates,
    totalSteelMass,
  };
}

/**
 * Find a profile by name in the appropriate catalog.
 */
function findProfileByName(name: string): SteelProfile | undefined {
  return (
    ipeProfiles.find(p => p.name === name) ??
    rhsProfiles.find(p => p.name === name) ??
    zProfiles.find(p => p.name === name) ??
    trussChordProfiles.find(p => p.name === name)
  );
}

/**
 * Calculate with profile overrides, rafter type forcing, and custom truss height.
 * Calls calculateHallStructure internally, then applies overrides and recalculates.
 */
export function calculateWithOverrides(
  params: HallParameters,
  overrides: ProfileOverrides,
  rafterType: RafterType,
  customTrussHeight: number | null
): CalculationResults {
  // Start with base calculation
  const baseResults = calculateHallStructure(params);

  // Determine effective rafter type behavior
  const fy = yieldStrength[params.steelGrade] ?? 235;
  let results = { ...baseResults };

  // If forcing truss for span <= 18, or forcing rafter for span > 18
  if (rafterType === 'force_truss' && params.span <= 18) {
    // Recalculate as truss even though span <= 18
    const { spacing: columnSpacing } = calculateColumnSpacing(params.length);
    const snowLoad = snowZoneLoads[params.snowZone] ?? 0.9;
    const Ce = getSnowExposureCoefficient(params.snowExposure ?? 'normal');
    const s_roof = computeSnowLoad(snowLoad, params.roofAngle, Ce);
    const g_roof = (coveringSelfWeight[params.coveringType] ?? 0.15) + 0.10;
    const q_rafter_SLS = (g_roof + s_roof) * columnSpacing;
    // Approximate ULS load
    const q_rafter_ULS = (1.35 * g_roof + 1.5 * s_roof) * columnSpacing;

    const effectiveTrussHeight = customTrussHeight ?? params.span / 10;
    const trussResult = selectTrussChordWithHeight(q_rafter_ULS, q_rafter_SLS, params.span, fy, effectiveTrussHeight);
    results.rafterProfile = null;
    results.trussChordProfile = trussResult.profile;
    results.trussHeight = trussResult.trussHeight;
    results.rafterDeflection = trussResult.deflection;
    results.rafterDeflectionLimit = trussResult.deflectionLimit;
  } else if (rafterType === 'force_rafter' && params.span > 18) {
    // Recalculate as IPE rafter even though span > 18
    const { spacing: columnSpacing } = calculateColumnSpacing(params.length);
    const snowLoad = snowZoneLoads[params.snowZone] ?? 0.9;
    const Ce = getSnowExposureCoefficient(params.snowExposure ?? 'normal');
    const s_roof = computeSnowLoad(snowLoad, params.roofAngle, Ce);
    const g_roof = (coveringSelfWeight[params.coveringType] ?? 0.15) + 0.10;
    const q_rafter_SLS = (g_roof + s_roof) * columnSpacing;
    const q_rafter_ULS = (1.35 * g_roof + 1.5 * s_roof) * columnSpacing;
    const halfSpan = params.span / 2;

    const rafterResult = selectRafter(q_rafter_ULS, q_rafter_SLS, halfSpan, fy);
    results.rafterProfile = rafterResult.profile;
    results.trussChordProfile = null;
    results.trussHeight = null;
    results.rafterDeflection = rafterResult.deflection;
    results.rafterDeflectionLimit = rafterResult.deflectionLimit;
  } else if (customTrussHeight != null && results.trussChordProfile != null) {
    // Apply custom truss height to existing truss calculation
    const { spacing: columnSpacing } = calculateColumnSpacing(params.length);
    const snowLoad = snowZoneLoads[params.snowZone] ?? 0.9;
    const Ce = getSnowExposureCoefficient(params.snowExposure ?? 'normal');
    const s_roof = computeSnowLoad(snowLoad, params.roofAngle, Ce);
    const g_roof = (coveringSelfWeight[params.coveringType] ?? 0.15) + 0.10;
    const q_rafter_SLS = (g_roof + s_roof) * columnSpacing;
    const q_rafter_ULS = (1.35 * g_roof + 1.5 * s_roof) * columnSpacing;

    const trussResult = selectTrussChordWithHeight(q_rafter_ULS, q_rafter_SLS, params.span, fy, customTrussHeight);
    results.trussChordProfile = trussResult.profile;
    results.trussHeight = trussResult.trussHeight;
    results.rafterDeflection = trussResult.deflection;
    results.rafterDeflectionLimit = trussResult.deflectionLimit;
  }

  // Apply profile overrides
  if (overrides.sideColumn) {
    const profile = findProfileByName(overrides.sideColumn);
    if (profile) {
      results = { ...results, sideColumnProfile: profile };
      // Recalculate utilization for overridden profile
      results.utilizationRatio = profile.W_pl > 0
        ? (baseResults.utilizationRatio * baseResults.sideColumnProfile.W_pl) / profile.W_pl
        : 999;
    }
  }
  if (overrides.endColumn) {
    const profile = findProfileByName(overrides.endColumn);
    if (profile) {
      results = { ...results, endColumnProfile: profile };
    }
  }
  if (overrides.rafter && results.rafterProfile) {
    const profile = findProfileByName(overrides.rafter);
    if (profile) {
      results = { ...results, rafterProfile: profile };
    }
  }
  if (overrides.trussChord && results.trussChordProfile) {
    const profile = findProfileByName(overrides.trussChord);
    if (profile) {
      results = { ...results, trussChordProfile: profile };
    }
  }
  if (overrides.purlin) {
    const profile = findProfileByName(overrides.purlin);
    if (profile) {
      results = { ...results, purlinProfile: profile };
    }
  }

  // Recalculate steel mass with substituted profiles
  const roofSlopeLength = calculateRoofSlopeLength(params.span, params.roofAngle);
  const { spacing: colSpacing, count: numberOfBays } = calculateColumnSpacing(params.length);
  const purlinSpacingCalc = calculatePurlinSpacing(roofSlopeLength);
  const numberOfFrames = numberOfBays + 1;
  const floorArea = params.span * params.length;
  const endColumnCount = 2 * 2;

  const sideColumnMass = results.sideColumnProfile.mass * params.wallHeight * 2 * numberOfFrames;
  const endColumnMass = results.endColumnProfile.mass * params.wallHeight * endColumnCount;
  let rafterMass = 0;
  if (results.rafterProfile) {
    rafterMass = results.rafterProfile.mass * roofSlopeLength * 2 * numberOfFrames;
  } else if (results.trussChordProfile) {
    rafterMass = results.trussChordProfile.mass * params.span * 2.5 * numberOfFrames;
  }
  const numPurlinsPerSlope = Math.ceil(roofSlopeLength / purlinSpacingCalc) + 1;
  const purlinMass = results.purlinProfile.mass * params.length * numPurlinsPerSlope * 2;

  // Recalculate connection plates with possibly overridden profiles
  const connectionPlates = calculateConnectionPlates(
    results.sideColumnProfile,
    results.rafterProfile,
    results.trussChordProfile,
    numberOfFrames,
    endColumnCount,
    params.span
  );

  const totalSteelMass = sideColumnMass + endColumnMass + rafterMass + purlinMass + connectionPlates.totalMass;
  results.connectionPlates = connectionPlates;
  results.totalSteelMass = totalSteelMass;
  results.steelMassPerM2 = totalSteelMass / floorArea;
  results.columnSpacing = colSpacing;

  return results;
}

/**
 * Select truss chord with a specific truss height (for overrides/custom height).
 */
function selectTrussChordWithHeight(
  q_rafter_ULS: number,
  q_rafter_SLS: number,
  span: number,
  fy: number,
  trussHeight: number
): {
  profile: SteelProfile;
  trussHeight: number;
  deflection: number;
  deflectionLimit: number;
} {
  const halfSpan = span / 2;
  const M_max = (q_rafter_ULS * halfSpan * halfSpan) / 8;
  const NEd = M_max / trussHeight;

  const numPanels = Math.max(4, Math.round(halfSpan / 2));
  const panelLength = halfSpan / numPanels;

  const deflLimit = getRafterDeflectionLimit(span);

  for (const profile of trussChordProfiles) {
    const i_min = profile.i_min ?? Math.sqrt(profile.I / profile.A);
    const util = computeTrussChordBuckling(NEd, profile.A, i_min, panelLength, fy, 0.49);

    const I_equiv_cm4 = 2 * profile.A * Math.pow(trussHeight * 100 / 2, 2);
    const defl = computeRafterDeflection(q_rafter_SLS, span, I_equiv_cm4);

    if (util <= 1.0 && defl <= deflLimit) {
      return { profile, trussHeight, deflection: defl, deflectionLimit: deflLimit };
    }
  }

  const largest = trussChordProfiles[trussChordProfiles.length - 1];
  const I_equiv_cm4 = 2 * largest.A * Math.pow(trussHeight * 100 / 2, 2);
  return {
    profile: largest,
    trussHeight,
    deflection: computeRafterDeflection(q_rafter_SLS, span, I_equiv_cm4),
    deflectionLimit: deflLimit,
  };
}

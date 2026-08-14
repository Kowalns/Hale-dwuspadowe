import type { HallParameters, CalculationResults, SteelProfile } from '../types';
import { ipeProfiles, rhsProfiles, zProfiles, trussChordProfiles } from '../data/profiles';
import { snowZoneLoads, windZoneLoads, coveringSelfWeight } from '../data/loads';
import {
  calculateColumnSpacing,
  calculatePurlinSpacing,
  calculateRidgeHeight,
  calculateRoofSlopeLength,
} from './geometry';

/** Yield strength in MPa */
const yieldStrength: Record<string, number> = {
  S235: 235,
  S355: 355,
};

/**
 * Select the smallest profile from a list where W_pl >= required W_pl.
 */
function selectByWpl(profiles: SteelProfile[], wPlRequired: number): SteelProfile {
  const sorted = [...profiles].sort((a, b) => a.W_pl - b.W_pl);
  const selected = sorted.find((p) => p.W_pl >= wPlRequired);
  return selected ?? sorted[sorted.length - 1];
}

/**
 * Select tube by cross-section area requirement.
 */
function selectByArea(profiles: SteelProfile[], areaRequired: number): SteelProfile {
  const sorted = [...profiles].sort((a, b) => a.A - b.A);
  const selected = sorted.find((p) => p.A >= areaRequired);
  return selected ?? sorted[sorted.length - 1];
}

/**
 * Select Z purlin by load capacity.
 */
function selectPurlinByLoad(loadPerMeter: number): SteelProfile {
  const sorted = [...zProfiles].sort((a, b) => (a.load_capacity ?? 0) - (b.load_capacity ?? 0));
  const selected = sorted.find((p) => (p.load_capacity ?? 0) >= loadPerMeter);
  return selected ?? sorted[sorted.length - 1];
}

/**
 * Select side column (IPE) based on wind load.
 * Schema: cantilever - M = q * h^2 / 2
 */
function selectSideColumn(params: HallParameters, columnSpacing: number): SteelProfile {
  const q_wind = windZoneLoads[params.windZone] * columnSpacing; // kN/m
  const M = (q_wind * params.wallHeight * params.wallHeight) / 2; // kNm
  const f_y = yieldStrength[params.steelGrade]; // MPa = N/mm2 = 10^-3 kN/mm2
  // W_pl_required = M / f_y (M in kNm, f_y in MPa)
  // M [kNm] = M * 10^6 [Nmm], f_y [N/mm2]
  // W_pl [mm3] = M*10^6 / f_y -> convert to cm3: / 1000
  const wPlRequired = (M * 1e6) / f_y / 1000; // cm3
  return selectByWpl(ipeProfiles, wPlRequired);
}

/**
 * Select end column (RHS/SHS) - lighter load (half spacing, lighter wind).
 */
function selectEndColumn(params: HallParameters, columnSpacing: number): SteelProfile {
  const q_wind = windZoneLoads[params.windZone] * (columnSpacing / 2); // half tributary area
  const M = (q_wind * params.wallHeight * params.wallHeight) / 2; // kNm
  const f_y = yieldStrength[params.steelGrade];
  const wPlRequired = (M * 1e6) / f_y / 1000; // cm3
  return selectByWpl(rhsProfiles, wPlRequired);
}

/**
 * Select rafter (IPE) for span <= 18m.
 * Simple beam model: M_max = q * L^2 / 8
 * Snow load is per horizontal plan area (PN-EN 1991-1-3),
 * so use half-span as the beam span.
 */
function selectRafter(params: HallParameters, columnSpacing: number): SteelProfile {
  const snowLoad = snowZoneLoads[params.snowZone];
  const selfWeight = coveringSelfWeight[params.coveringType];
  const halfSpan = params.span / 2;
  const q = (snowLoad + selfWeight) * columnSpacing; // kN/m (load per plan projection)
  const M = (q * halfSpan * halfSpan) / 8; // kNm
  const f_y = yieldStrength[params.steelGrade];
  const wPlRequired = (M * 1e6) / f_y / 1000; // cm3
  return selectByWpl(ipeProfiles, wPlRequired);
}

/**
 * Select truss chord (square tube) for span > 18m.
 * Truss height = span / 12
 * N = M_max / h_truss
 * A_required = N / f_y
 * Snow load is per horizontal plan area (PN-EN 1991-1-3),
 * so use half-span as the beam span.
 */
function selectTrussChord(
  params: HallParameters,
  columnSpacing: number
): { profile: SteelProfile; trussHeight: number } {
  const snowLoad = snowZoneLoads[params.snowZone];
  const selfWeight = coveringSelfWeight[params.coveringType];
  const halfSpan = params.span / 2;
  const q = (snowLoad + selfWeight) * columnSpacing; // kN/m (load per plan projection)
  const M_max = (q * halfSpan * halfSpan) / 8; // kNm
  const trussHeight = params.span / 12; // m
  const N = M_max / trussHeight; // kN (M in kNm, h in m -> N in kN)
  const f_y = yieldStrength[params.steelGrade]; // MPa = N/mm2
  // A_required [mm2] = N[kN]*1000 / f_y[N/mm2], convert to cm2: / 100
  const aRequired = (N * 1000) / f_y / 100; // cm2
  const profile = selectByArea(trussChordProfiles, aRequired);
  return { profile, trussHeight };
}

/**
 * Select purlin (Z profile) based on load.
 */
function selectPurlin(params: HallParameters, purlinSpacing: number): SteelProfile {
  const snowLoad = snowZoneLoads[params.snowZone];
  const selfWeight = coveringSelfWeight[params.coveringType];
  const loadPerMeter = (snowLoad + selfWeight) * purlinSpacing; // kN/m
  return selectPurlinByLoad(loadPerMeter);
}

/**
 * Select bracing diameter based on total loads.
 * Light: 12mm, Standard: 16mm, Heavy: 20mm
 */
function selectBracing(params: HallParameters, columnSpacing: number): number {
  const snowLoad = snowZoneLoads[params.snowZone];
  const windLoad = windZoneLoads[params.windZone];
  const totalLoad = (snowLoad + windLoad) * columnSpacing * params.span;

  if (totalLoad < 50) return 12;
  if (totalLoad < 120) return 16;
  return 20;
}

/**
 * Main calculation function: takes hall parameters, returns all results.
 */
export function calculateHallStructure(params: HallParameters): CalculationResults {
  const { spacing: columnSpacing, count: numberOfBays } = calculateColumnSpacing(params.length);
  const roofSlopeLength = calculateRoofSlopeLength(params.span, params.roofAngle);
  const purlinSpacing = calculatePurlinSpacing(roofSlopeLength);
  const ridgeHeight = calculateRidgeHeight(params.wallHeight, params.span, params.roofAngle);

  const sideColumnProfile = selectSideColumn(params, columnSpacing);
  const endColumnProfile = selectEndColumn(params, columnSpacing);

  let rafterProfile: SteelProfile | null = null;
  let trussChordProfile: SteelProfile | null = null;
  let trussHeight: number | null = null;

  if (params.span <= 18) {
    rafterProfile = selectRafter(params, columnSpacing);
  } else {
    const trussResult = selectTrussChord(params, columnSpacing);
    trussChordProfile = trussResult.profile;
    trussHeight = trussResult.trussHeight;
  }

  const purlinProfile = selectPurlin(params, purlinSpacing);
  const bracingDiameter = selectBracing(params, columnSpacing);

  return {
    sideColumnProfile,
    endColumnProfile,
    rafterProfile,
    trussChordProfile,
    purlinProfile,
    bracingDiameter,
    columnSpacing,
    purlinSpacing,
    trussHeight,
    numberOfFrames: numberOfBays + 1, // frames = bays + 1
    ridgeHeight,
  };
}

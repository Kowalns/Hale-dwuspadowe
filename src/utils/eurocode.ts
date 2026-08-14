/**
 * Eurocode helper functions for structural steel hall calculations
 * PN-EN 1990 (combinations), PN-EN 1991-1-3 (snow), PN-EN 1991-1-4 (wind),
 * PN-EN 1993-1-1 (steel design, stability)
 */

import type { TerrainCategory, SnowExposure } from '../types';

// ============================================================
// CONSTANTS
// ============================================================

/** Elastic modulus of steel [MPa] */
export const E_STEEL = 210000;

/** Partial safety factors */
export const GAMMA_G_UNFAV = 1.35; // permanent actions, unfavorable
export const GAMMA_G_FAV = 1.00; // permanent actions, favorable
export const GAMMA_Q = 1.50; // variable actions
export const XI_FACTOR = 0.85; // reduction factor for permanent actions (6.10b)
export const GAMMA_M1 = 1.0; // for stability checks per PN-EN 1993-1-1

/** Combination factors psi_0 */
export const PSI_0_SNOW = 0.5;
export const PSI_0_WIND = 0.6;

// ============================================================
// SNOW LOADS (PN-EN 1991-1-3)
// ============================================================

/**
 * Compute snow shape factor mu per PN-EN 1991-1-3
 * @param alpha - roof angle in degrees
 */
export function computeSnowShapeFactor(alpha: number): number {
  if (alpha <= 30) return 0.8;
  if (alpha >= 60) return 0.0;
  // Linear interpolation between 30 and 60 degrees
  return 0.8 * (60 - alpha) / 30;
}

/**
 * Map snow exposure type to Ce coefficient
 */
export function getSnowExposureCoefficient(exposure: SnowExposure): number {
  switch (exposure) {
    case 'windy': return 0.8;
    case 'normal': return 1.0;
    case 'sheltered': return 1.2;
  }
}

/**
 * Compute snow load on roof per PN-EN 1991-1-3
 * s = mu * Ce * Ct * Sk [kN/m2]
 * @param Sk - characteristic snow load from zone [kN/m2]
 * @param alpha - roof angle [degrees]
 * @param Ce - exposure coefficient
 * @param Ct - thermal coefficient (default 1.0)
 * @returns snow load on roof [kN/m2]
 */
export function computeSnowLoad(Sk: number, alpha: number, Ce: number, Ct: number = 1.0): number {
  const mu = computeSnowShapeFactor(alpha);
  return mu * Ce * Ct * Sk;
}

// ============================================================
// WIND LOADS (PN-EN 1991-1-4)
// ============================================================

/** Roughness lengths z0 for terrain categories [m] */
const TERRAIN_Z0: Record<TerrainCategory, number> = {
  1: 0.003,
  2: 0.05,
  3: 0.3,
  4: 1.0,
};

/** Minimum heights z_min for terrain categories [m] */
const TERRAIN_ZMIN: Record<TerrainCategory, number> = {
  1: 1,
  2: 2,
  3: 5,
  4: 10,
};

/**
 * Compute wind exposure factor ce(h) based on height and terrain category.
 * Uses simplified formula: ce(z) = cr(z)^2 * (1 + 7*Iv(z))
 * where cr(z) = kr * ln(z/z0), kr = 0.19*(z0/0.05)^0.07
 * and Iv(z) = 1/(c0*ln(z/z0)) with c0=1.0
 *
 * @param h - reference height [m]
 * @param terrainCategory - terrain category (1-4)
 * @returns exposure factor ce(h)
 */
export function computeExposureFactor(h: number, terrainCategory: TerrainCategory): number {
  const z0 = TERRAIN_Z0[terrainCategory];
  const zMin = TERRAIN_ZMIN[terrainCategory];
  const z = Math.max(h, zMin);

  const kr = 0.19 * Math.pow(z0 / 0.05, 0.07);
  const cr = kr * Math.log(z / z0);
  const Iv = 1.0 / Math.log(z / z0); // turbulence intensity (c0=1)
  const ce = cr * cr * (1 + 7 * Iv);
  return ce;
}

/**
 * Get base wind velocity for a given zone [m/s]
 */
export function getBaseWindVelocity(windZone: number): number {
  const velocities: Record<number, number> = { 1: 22, 2: 26, 3: 30 };
  return velocities[windZone] ?? 22;
}

/**
 * Compute base wind pressure qk = 0.5 * rho * vb^2 / 1000 [kN/m2]
 * @param vb - base wind velocity [m/s]
 */
export function computeBaseWindPressure(vb: number): number {
  return 0.5 * 1.25 * vb * vb / 1000;
}

/**
 * Compute peak velocity pressure qp(h) = ce(h) * qk [kN/m2]
 */
export function computePeakVelocityPressure(
  windZone: number,
  h: number,
  terrainCategory: TerrainCategory
): number {
  const vb = getBaseWindVelocity(windZone);
  const qk = computeBaseWindPressure(vb);
  const ce = computeExposureFactor(h, terrainCategory);
  return ce * qk;
}

/**
 * External pressure coefficient Cpe,10 for windward wall (zone D)
 */
export function getCpeWallWindward(): number {
  return 0.8;
}

/**
 * External pressure coefficient Cpe,10 for leeward wall (zone E)
 */
export function getCpeWallLeeward(): number {
  return -0.5;
}

/**
 * External pressure coefficient Cpe,10 for windward roof slope.
 * Interpolation based on roof angle for alpha 5-30 degrees.
 * For alpha < 5: use -0.9 (suction)
 * For 5 <= alpha <= 15: interpolation from -0.9/+0.2 to -0.5/+0.2
 *   (use the most unfavorable: for ULS pressure use positive, for uplift use negative)
 * For 15 < alpha <= 30: from +0.2 to +0.7
 * For alpha > 30: +0.7
 *
 * This function returns the PRESSURE value (positive = pushing down on roof).
 * For uplift check, use getCpeRoofWindwardSuction().
 */
export function getCpeRoofWindward(alpha: number): number {
  if (alpha <= 5) return 0.0; // near-flat: suction only (handled by suction function)
  if (alpha <= 15) {
    // Linear interpolation from 0.0 at 5 deg to +0.2 at 15 deg
    return 0.0 + 0.2 * (alpha - 5) / 10;
  }
  if (alpha <= 30) {
    // Linear interpolation from +0.2 at 15 deg to +0.7 at 30 deg
    return 0.2 + 0.5 * (alpha - 15) / 15;
  }
  return 0.7;
}

/**
 * Cpe,10 for windward roof slope - SUCTION case (negative pressure / uplift).
 * For alpha 5-15 degrees: -0.9 to -0.5
 * For alpha 15-30 degrees: -0.5 to -0.2
 * For alpha > 30: 0 (no suction, only pressure)
 */
export function getCpeRoofWindwardSuction(alpha: number): number {
  if (alpha <= 5) return -0.9;
  if (alpha <= 15) {
    // -0.9 at 5 deg to -0.5 at 15 deg
    return -0.9 + 0.4 * (alpha - 5) / 10;
  }
  if (alpha <= 30) {
    // -0.5 at 15 deg to -0.2 at 30 deg
    return -0.5 + 0.3 * (alpha - 15) / 15;
  }
  return 0.0;
}

/**
 * External pressure coefficient Cpe,10 for leeward roof slope
 */
export function getCpeRoofLeeward(): number {
  return -0.5;
}

// ============================================================
// LOAD COMBINATIONS (PN-EN 1990)
// ============================================================

export interface LoadCombinationForces {
  name: string;
  M_column: number; // kNm - moment at column head
  N_column: number; // kN - axial force in column (compression positive)
  V_column: number; // kN - shear force at column base
  q_rafter: number; // kN/m - linear load on rafter/truss (ULS)
}

export interface CharacteristicLoads {
  /** Dead load on roof per plan area [kN/m2] */
  g_roof: number;
  /** Snow load on roof per plan area [kN/m2] */
  s_roof: number;
  /** Wind pressure on wall D (windward) [kN/m2] */
  w_D: number;
  /** Wind suction on wall E (leeward) [kN/m2] */
  w_E: number;
  /** Wind pressure/suction on windward roof [kN/m2] */
  w_roof_wind: number;
  /** Wind suction on windward roof (uplift case) [kN/m2] */
  w_roof_suction: number;
  /** Wind suction on leeward roof [kN/m2] */
  w_roof_lee: number;
  /** Column spacing (tributary width) [m] */
  Lk: number;
  /** Wall height [m] */
  H: number;
  /** Span [m] */
  span: number;
  /** Roof angle [degrees] */
  alpha: number;
  /** Frame reduction factor for moment */
  k_ramy: number;
}

/**
 * Compute frame stiffness reduction factor.
 * For a two-hinged portal frame, moment at column head is reduced
 * compared to a pure cantilever.
 * k_ramy depends on ratio of rafter/column stiffness. Default approximation: 0.6
 */
export function computeFrameFactor(): number {
  return 0.6;
}

/**
 * Compute load combinations per PN-EN 1990 and return internal forces
 * for the governing combination.
 *
 * KOMB 1: Snow dominant - 1.35*0.85*G + 1.5*S + 1.5*0.6*W
 * KOMB 2: Wind dominant - 1.35*0.85*G + 1.5*W + 1.5*0.5*S
 * KOMB 3: Wind uplift - 1.00*G + 1.5*W_suction (checks if roof lifts)
 */
export function computeLoadCombinations(loads: CharacteristicLoads): LoadCombinationForces[] {
  const { g_roof, s_roof, w_D, w_E, w_roof_wind, w_roof_suction, Lk, H, span, k_ramy } = loads;

  // Horizontal wind loads on column (kN/m linear along column height)
  const q_wind_D = w_D * Lk; // kN/m on windward column from wall
  const q_wind_E = Math.abs(w_E) * Lk; // kN/m on leeward column from wall (suction pulls outward)
  const q_wind_total = q_wind_D + q_wind_E; // total horizontal distributed load on frame

  // For a 2-hinged portal frame with wind:
  // The horizontal reaction at base H_base = (q_wind_total * H) / 2
  // Moment at column head from wind (reduced by frame action):
  const M_wind_column = (q_wind_total * H * H / 2) * k_ramy;

  // Vertical loads on rafter (kN/m linear along rafter, per plan projection)
  const q_dead_rafter = g_roof * Lk; // kN/m
  const q_snow_rafter = s_roof * Lk; // kN/m
  const q_wind_roof_pressure = w_roof_wind * Lk; // kN/m (downward if positive)
  const q_wind_roof_suction = w_roof_suction * Lk; // kN/m (upward, negative value)

  // Axial force in column from vertical loads: N = q_vertical * span/2
  const halfSpan = span / 2;

  // Self-weight of column (approximate IPE 270 as starting point): ~0.36 kN/m * H
  const columnSelfWeight = 0.36 * H; // kN (approximate, small contribution)

  // --- KOMB 1: Snow dominant ---
  // ULS factors: 1.35*0.85*G + 1.5*S + 1.5*0.6*W
  const gammaG_red = GAMMA_G_UNFAV * XI_FACTOR; // 1.1475
  const komb1_q_rafter = gammaG_red * q_dead_rafter + GAMMA_Q * q_snow_rafter +
    GAMMA_Q * PSI_0_WIND * Math.max(q_wind_roof_pressure, 0);
  const komb1_M = gammaG_red * 0 + GAMMA_Q * PSI_0_WIND * M_wind_column;
  const komb1_N = komb1_q_rafter * halfSpan + gammaG_red * columnSelfWeight;
  const komb1_V = GAMMA_Q * PSI_0_WIND * q_wind_total * H / 2;

  // --- KOMB 2: Wind dominant ---
  // ULS factors: 1.35*0.85*G + 1.5*W + 1.5*0.5*S
  const komb2_q_rafter = gammaG_red * q_dead_rafter + GAMMA_Q * PSI_0_SNOW * q_snow_rafter +
    GAMMA_Q * Math.max(q_wind_roof_pressure, 0);
  const komb2_M = GAMMA_Q * M_wind_column;
  const komb2_N = komb2_q_rafter * halfSpan + gammaG_red * columnSelfWeight;
  const komb2_V = GAMMA_Q * q_wind_total * H / 2;

  // --- KOMB 3: Wind uplift ---
  // Checks if wind suction lifts the roof: 1.0*G + 1.5*W_suction
  const komb3_q_rafter = GAMMA_G_FAV * q_dead_rafter + GAMMA_Q * q_wind_roof_suction;
  // Column moment from wind in uplift case (full wind, favorable dead load)
  const komb3_M = GAMMA_Q * M_wind_column;
  const komb3_N = Math.max(0, GAMMA_G_FAV * q_dead_rafter * Lk * halfSpan + gammaG_red * columnSelfWeight);
  const komb3_V = GAMMA_Q * q_wind_total * H / 2;

  return [
    {
      name: 'KOMB 1 (snow dominant)',
      M_column: komb1_M,
      N_column: komb1_N,
      V_column: komb1_V,
      q_rafter: komb1_q_rafter,
    },
    {
      name: 'KOMB 2 (wind dominant)',
      M_column: komb2_M,
      N_column: komb2_N,
      V_column: komb2_V,
      q_rafter: komb2_q_rafter,
    },
    {
      name: 'KOMB 3 (wind uplift)',
      M_column: komb3_M,
      N_column: Math.abs(komb3_N),
      V_column: komb3_V,
      q_rafter: Math.abs(komb3_q_rafter), // absolute for dimensioning
    },
  ];
}

// ============================================================
// STABILITY CHECKS (PN-EN 1993-1-1)
// ============================================================

/**
 * Compute flexural buckling factor chi_y per PN-EN 1993-1-1, clause 6.3.1
 *
 * @param Lcr_m - buckling length [m]
 * @param i_y_cm - radius of gyration [cm]
 * @param fy - yield strength [MPa]
 * @param alpha_imp - imperfection factor (0.21=a, 0.34=b, 0.49=c, 0.76=d)
 * @returns chi_y (buckling reduction factor, 0 to 1)
 */
export function computeBucklingFactor(
  Lcr_m: number,
  i_y_cm: number,
  fy: number,
  alpha_imp: number = 0.34
): number {
  const epsilon = Math.sqrt(235 / fy);
  const lambda1 = 93.9 * epsilon; // = pi * sqrt(E/fy) for E=210000
  const Lcr_cm = Lcr_m * 100;
  const lambda_bar = Lcr_cm / (i_y_cm * lambda1);

  if (lambda_bar <= 0.2) return 1.0;

  const Phi = 0.5 * (1 + alpha_imp * (lambda_bar - 0.2) + lambda_bar * lambda_bar);
  const chi = 1.0 / (Phi + Math.sqrt(Phi * Phi - lambda_bar * lambda_bar));
  return Math.min(chi, 1.0);
}

/**
 * Compute lateral-torsional buckling factor chi_LT.
 * Simplified: returns 0.9 as safe approximation for columns
 * where the compression flange is not continuously restrained.
 * If compression flange is restrained (e.g., by purlins/cladding): chi_LT = 1.0
 *
 * @param isRestrainedFlange - true if compression flange is laterally restrained
 */
export function computeLTBFactor(isRestrainedFlange: boolean = false): number {
  return isRestrainedFlange ? 1.0 : 0.9;
}

/**
 * Compute interaction check per PN-EN 1993-1-1, formula 6.61/6.62
 * (Combined axial compression + bending with stability)
 *
 * Utilization = NEd/(chi_y * A * fy / gammaM1) + kyy * MEd / (chi_LT * Wpl * fy / gammaM1)
 *
 * @param NEd - design axial force [kN]
 * @param MEd - design bending moment [kNm]
 * @param A_cm2 - cross-section area [cm2]
 * @param Wpl_cm3 - plastic section modulus [cm3]
 * @param fy - yield strength [MPa]
 * @param chi_y - flexural buckling factor
 * @param chi_LT - lateral-torsional buckling factor
 * @param kyy - interaction factor (default 1.0)
 * @param gammaM1 - partial safety factor for stability (default 1.0)
 * @returns utilization ratio (<=1.0 means OK)
 */
export function computeInteractionCheck(
  NEd: number,
  MEd: number,
  A_cm2: number,
  Wpl_cm3: number,
  fy: number,
  chi_y: number,
  chi_LT: number,
  kyy: number = 1.0,
  gammaM1: number = GAMMA_M1
): number {
  // Convert units: A [cm2] -> [mm2] = A*100, Wpl [cm3] -> [mm3] = Wpl*1000
  // NEd [kN] -> [N] = NEd*1000, MEd [kNm] -> [Nmm] = MEd*1e6
  const NRd = chi_y * (A_cm2 * 100) * fy / gammaM1 / 1000; // [kN]
  const MRd = chi_LT * (Wpl_cm3 * 1000) * fy / gammaM1 / 1e6; // [kNm]

  const util_N = NEd / NRd;
  const util_M = kyy * MEd / MRd;

  return util_N + util_M;
}

/**
 * Compute interaction factor kyy (simplified method B, PN-EN 1993-1-1 Annex B)
 * kyy = Cmy * (1 + min(0.8, (lambda_bar_y - 0.2) * NEd/(chi_y * NRk/gammaM1)))
 *
 * For simplification: kyy = Cmy * (1 + 0.6 * lambda_bar_y * NEd/NRd) capped at Cmy*(1+0.8*NEd/NRd)
 *
 * @param lambda_bar_y - relative slenderness
 * @param NEd - design axial force [kN]
 * @param chi_y - buckling factor
 * @param A_cm2 - cross section area [cm2]
 * @param fy - yield strength [MPa]
 * @param Cmy - equivalent moment factor (default 0.9 for uniform loading)
 */
export function computeKyy(
  lambda_bar_y: number,
  NEd: number,
  chi_y: number,
  A_cm2: number,
  fy: number,
  Cmy: number = 0.9
): number {
  const NRd = chi_y * A_cm2 * 100 * fy / GAMMA_M1 / 1000; // kN
  const factor = Math.min(0.8, (lambda_bar_y - 0.2) * NEd / NRd);
  const kyy = Cmy * (1 + Math.max(0, factor));
  return Math.max(kyy, 1.0); // minimum 1.0 for safety
}

/**
 * Compute relative slenderness lambda_bar for buckling
 */
export function computeRelativeSlenderness(Lcr_m: number, i_y_cm: number, fy: number): number {
  const epsilon = Math.sqrt(235 / fy);
  const lambda1 = 93.9 * epsilon;
  const Lcr_cm = Lcr_m * 100;
  return Lcr_cm / (i_y_cm * lambda1);
}

// ============================================================
// TRUSS CHORD BUCKLING (PN-EN 1993-1-1)
// ============================================================

/**
 * Check truss chord buckling (top chord in compression).
 * Uses buckling curve c (alpha = 0.49) for hollow sections.
 *
 * @param NEd - design axial force in chord [kN]
 * @param A_cm2 - chord cross-section area [cm2]
 * @param i_min_cm - minimum radius of gyration [cm]
 * @param Lcr_m - buckling length (panel length) [m]
 * @param fy - yield strength [MPa]
 * @param alpha_imp - imperfection factor (default 0.49 for curve c - cold-formed hollow sections)
 * @returns utilization ratio (<=1.0 means OK)
 */
export function computeTrussChordBuckling(
  NEd: number,
  A_cm2: number,
  i_min_cm: number,
  Lcr_m: number,
  fy: number,
  alpha_imp: number = 0.49
): number {
  const chi = computeBucklingFactor(Lcr_m, i_min_cm, fy, alpha_imp);
  const NRd = chi * A_cm2 * 100 * fy / GAMMA_M1 / 1000; // kN
  return NEd / NRd;
}

// ============================================================
// SERVICEABILITY LIMIT STATE (SGU) - DEFLECTIONS
// ============================================================

/**
 * Compute horizontal deflection of column (cantilever under uniform wind load)
 * delta = q * H^4 / (8 * E * I) [mm]
 *
 * @param q_kN_per_m - characteristic wind load [kN/m] (NOT factored for SLS)
 * @param H_m - column height [m]
 * @param I_cm4 - moment of inertia [cm4]
 * @returns deflection [mm]
 */
export function computeColumnDeflection(q_kN_per_m: number, H_m: number, I_cm4: number): number {
  // Convert: q [kN/m] -> [N/mm] = q/1000*1000 = q [N/mm]... wait
  // q [kN/m] = q * 1000 [N/m] = q [N/mm]
  // H [m] = H * 1000 [mm]
  // I [cm4] = I * 10000 [mm4]
  // E [MPa] = [N/mm2]
  // delta = q*H^4 / (8*E*I) with consistent units [N/mm, mm, N/mm2, mm4]
  const q_N_per_mm = q_kN_per_m; // 1 kN/m = 1 N/mm
  const H_mm = H_m * 1000;
  const I_mm4 = I_cm4 * 10000;
  return (q_N_per_mm * Math.pow(H_mm, 4)) / (8 * E_STEEL * I_mm4);
}

/**
 * Compute vertical deflection of rafter/beam (simply supported, uniform load)
 * delta = 5 * q * L^4 / (384 * E * I) [mm]
 *
 * @param q_kN_per_m - characteristic load on rafter [kN/m] (SLS, unfactored)
 * @param L_m - rafter span [m] (half-span for single rafter)
 * @param I_cm4 - moment of inertia [cm4]
 * @returns deflection [mm]
 */
export function computeRafterDeflection(q_kN_per_m: number, L_m: number, I_cm4: number): number {
  const q_N_per_mm = q_kN_per_m; // 1 kN/m = 1 N/mm
  const L_mm = L_m * 1000;
  const I_mm4 = I_cm4 * 10000;
  return (5 * q_N_per_mm * Math.pow(L_mm, 4)) / (384 * E_STEEL * I_mm4);
}

/**
 * Column deflection limit: H/150
 */
export function getColumnDeflectionLimit(H_m: number): number {
  return H_m * 1000 / 150; // mm
}

/**
 * Rafter deflection limit: L/200
 */
export function getRafterDeflectionLimit(L_m: number): number {
  return L_m * 1000 / 200; // mm
}

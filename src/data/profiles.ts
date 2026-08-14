import type { SteelProfile } from '../types';

/**
 * IPE profiles catalog (European I-beam standard)
 * Values from Euronorm 19-57 / EN 10034
 * i_y = radius of gyration about strong axis (cm)
 * It = torsion constant (Saint-Venant) [cm4]
 * Iw = warping constant [cm6] x 10^3 (stored as 10^3 cm6, i.e. value * 1000 = actual cm6)
 */
export const ipeProfiles: SteelProfile[] = [
  { name: 'IPE 80', type: 'IPE', h: 80, b: 46, tw: 3.8, tf: 5.2, A: 7.64, I: 80.1, W_pl: 23.2, mass: 6.0, i_y: 3.24, It: 0.70, Iw: 0.118 },
  { name: 'IPE 100', type: 'IPE', h: 100, b: 55, tw: 4.1, tf: 5.7, A: 10.3, I: 171, W_pl: 39.4, mass: 8.1, i_y: 4.07, It: 1.20, Iw: 0.351 },
  { name: 'IPE 120', type: 'IPE', h: 120, b: 64, tw: 4.4, tf: 6.3, A: 13.2, I: 318, W_pl: 60.7, mass: 10.4, i_y: 4.90, It: 1.74, Iw: 0.890 },
  { name: 'IPE 140', type: 'IPE', h: 140, b: 73, tw: 4.7, tf: 6.9, A: 16.4, I: 541, W_pl: 88.3, mass: 12.9, i_y: 5.74, It: 2.45, Iw: 1.98 },
  { name: 'IPE 160', type: 'IPE', h: 160, b: 82, tw: 5.0, tf: 7.4, A: 20.1, I: 869, W_pl: 124, mass: 15.8, i_y: 6.58, It: 3.60, Iw: 3.96 },
  { name: 'IPE 180', type: 'IPE', h: 180, b: 91, tw: 5.3, tf: 8.0, A: 23.9, I: 1317, W_pl: 166, mass: 18.8, i_y: 7.42, It: 4.79, Iw: 7.43 },
  { name: 'IPE 200', type: 'IPE', h: 200, b: 100, tw: 5.6, tf: 8.5, A: 28.5, I: 1943, W_pl: 221, mass: 22.4, i_y: 8.26, It: 6.98, Iw: 13.0 },
  { name: 'IPE 220', type: 'IPE', h: 220, b: 110, tw: 5.9, tf: 9.2, A: 33.4, I: 2772, W_pl: 285, mass: 26.2, i_y: 9.11, It: 9.07, Iw: 22.7 },
  { name: 'IPE 240', type: 'IPE', h: 240, b: 120, tw: 6.2, tf: 9.8, A: 39.1, I: 3892, W_pl: 367, mass: 30.7, i_y: 9.97, It: 12.9, Iw: 37.4 },
  { name: 'IPE 270', type: 'IPE', h: 270, b: 135, tw: 6.6, tf: 10.2, A: 45.9, I: 5790, W_pl: 484, mass: 36.1, i_y: 11.23, It: 15.9, Iw: 70.6 },
  { name: 'IPE 300', type: 'IPE', h: 300, b: 150, tw: 7.1, tf: 10.7, A: 53.8, I: 8356, W_pl: 628, mass: 42.2, i_y: 12.46, It: 20.1, Iw: 126 },
  { name: 'IPE 330', type: 'IPE', h: 330, b: 160, tw: 7.5, tf: 11.5, A: 62.6, I: 11770, W_pl: 804, mass: 49.1, i_y: 13.71, It: 26.5, Iw: 199 },
  { name: 'IPE 360', type: 'IPE', h: 360, b: 170, tw: 8.0, tf: 12.7, A: 72.7, I: 16270, W_pl: 1019, mass: 57.1, i_y: 14.95, It: 37.3, Iw: 314 },
  { name: 'IPE 400', type: 'IPE', h: 400, b: 180, tw: 8.6, tf: 13.5, A: 84.5, I: 23130, W_pl: 1307, mass: 66.3, i_y: 16.55, It: 51.1, Iw: 490 },
  { name: 'IPE 450', type: 'IPE', h: 450, b: 190, tw: 9.4, tf: 14.6, A: 98.8, I: 33740, W_pl: 1702, mass: 77.6, i_y: 18.48, It: 66.9, Iw: 791 },
  { name: 'IPE 500', type: 'IPE', h: 500, b: 200, tw: 10.2, tf: 16.0, A: 116, I: 48200, W_pl: 2194, mass: 90.7, i_y: 20.43, It: 89.3, Iw: 1249 },
  { name: 'IPE 550', type: 'IPE', h: 550, b: 210, tw: 11.1, tf: 17.2, A: 134, I: 67120, W_pl: 2788, mass: 106, i_y: 22.35, It: 123, Iw: 1884 },
  { name: 'IPE 600', type: 'IPE', h: 600, b: 220, tw: 12.0, tf: 19.0, A: 156, I: 92080, W_pl: 3512, mass: 122, i_y: 24.28, It: 165, Iw: 2846 },
];

/**
 * RHS/SHS profiles (Rectangular/Square Hollow Sections)
 * Values from EN 10210-2
 */
export const rhsProfiles: SteelProfile[] = [
  { name: 'SHS 60x60x3', type: 'RHS', h: 60, b: 60, t: 3, A: 6.56, I: 34.2, W_pl: 13.6, mass: 5.15, i_min: 2.28 },
  { name: 'SHS 80x80x4', type: 'RHS', h: 80, b: 80, t: 4, A: 11.7, I: 113, W_pl: 34.2, mass: 9.22, i_min: 3.11 },
  { name: 'SHS 100x100x4', type: 'RHS', h: 100, b: 100, t: 4, A: 14.9, I: 231, W_pl: 55.8, mass: 11.7, i_min: 3.94 },
  { name: 'SHS 120x120x5', type: 'RHS', h: 120, b: 120, t: 5, A: 22.4, I: 494, W_pl: 100, mass: 17.5, i_min: 4.70 },
  { name: 'SHS 140x140x5', type: 'RHS', h: 140, b: 140, t: 5, A: 26.4, I: 802, W_pl: 138, mass: 20.7, i_min: 5.51 },
  { name: 'SHS 150x150x6', type: 'RHS', h: 150, b: 150, t: 6, A: 33.6, I: 1139, W_pl: 185, mass: 26.4, i_min: 5.82 },
  { name: 'SHS 160x160x6', type: 'RHS', h: 160, b: 160, t: 6, A: 36.0, I: 1403, W_pl: 213, mass: 28.3, i_min: 6.24 },
  { name: 'SHS 180x180x6', type: 'RHS', h: 180, b: 180, t: 6, A: 40.8, I: 2044, W_pl: 276, mass: 32.0, i_min: 7.08 },
  { name: 'SHS 200x200x8', type: 'RHS', h: 200, b: 200, t: 8, A: 59.2, I: 3598, W_pl: 441, mass: 46.5, i_min: 7.80 },
];

/**
 * Z profiles (cold-formed purlins)
 * Two standard Z purlin profiles for roof purlins
 */
export const zProfiles: SteelProfile[] = [
  { name: 'Z 200x68x60', type: 'Z', h: 200, b: 68, b_f: 60, t: 2.0, A: 7.44, I: 450, W_pl: 52.5, mass: 5.84, load_capacity: 5.8 },
  { name: 'Z 150x68x60', type: 'Z', h: 150, b: 68, b_f: 60, t: 1.5, A: 4.89, I: 198, W_pl: 30.4, mass: 3.84, load_capacity: 3.5 },
];

/**
 * Rk profiles (square closed tubes)
 * Values from EN 10210-2
 */
export const rkProfiles: SteelProfile[] = [
  { name: 'Rk 40x40x2', type: 'RK', h: 40, b: 40, t: 2, A: 2.94, I: 7.84, W_pl: 4.71, mass: 2.31, i_min: 1.63 },
  { name: 'Rk 50x50x2', type: 'RK', h: 50, b: 50, t: 2, A: 3.74, I: 15.8, W_pl: 7.58, mass: 2.93, i_min: 2.05 },
  { name: 'Rk 60x60x2', type: 'RK', h: 60, b: 60, t: 2, A: 4.54, I: 27.9, W_pl: 11.2, mass: 3.56, i_min: 2.48 },
  { name: 'Rk 70x70x3', type: 'RK', h: 70, b: 70, t: 3, A: 7.74, I: 62.2, W_pl: 21.4, mass: 6.07, i_min: 2.84 },
  { name: 'Rk 80x80x2', type: 'RK', h: 80, b: 80, t: 2, A: 6.14, I: 60.5, W_pl: 18.2, mass: 4.82, i_min: 3.14 },
  { name: 'Rk 80x80x3', type: 'RK', h: 80, b: 80, t: 3, A: 8.94, I: 84.7, W_pl: 25.8, mass: 7.02, i_min: 3.08 },
  { name: 'Rk 100x100x3', type: 'RK', h: 100, b: 100, t: 3, A: 11.3, I: 170, W_pl: 41.1, mass: 8.89, i_min: 3.88 },
  { name: 'Rk 100x100x4', type: 'RK', h: 100, b: 100, t: 4, A: 14.7, I: 214, W_pl: 52.8, mass: 11.5, i_min: 3.81 },
  { name: 'Rk 120x120x4', type: 'RK', h: 120, b: 120, t: 4, A: 17.9, I: 385, W_pl: 78.0, mass: 14.0, i_min: 4.64 },
  { name: 'Rk 120x120x5', type: 'RK', h: 120, b: 120, t: 5, A: 22.0, I: 459, W_pl: 94.5, mass: 17.3, i_min: 4.57 },
];

/**
 * Rp profiles (rectangular closed tubes)
 * Values from EN 10210-2
 */
export const rpProfiles: SteelProfile[] = [
  { name: 'Rp 80x40x2', type: 'RP', h: 80, b: 40, t: 2, A: 4.54, I: 30.5, W_pl: 9.45, mass: 3.56, i_min: 1.52 },
  { name: 'Rp 80x40x3', type: 'RP', h: 80, b: 40, t: 3, A: 6.54, I: 41.2, W_pl: 13.0, mass: 5.13, i_min: 1.47 },
  { name: 'Rp 100x50x2', type: 'RP', h: 100, b: 50, t: 2, A: 5.74, I: 61.6, W_pl: 15.2, mass: 4.50, i_min: 1.92 },
  { name: 'Rp 100x50x3', type: 'RP', h: 100, b: 50, t: 3, A: 8.34, I: 84.6, W_pl: 21.3, mass: 6.55, i_min: 1.86 },
  { name: 'Rp 120x60x3', type: 'RP', h: 120, b: 60, t: 3, A: 10.1, I: 149, W_pl: 30.6, mass: 7.96, i_min: 2.24 },
  { name: 'Rp 120x80x3', type: 'RP', h: 120, b: 80, t: 3, A: 11.3, I: 181, W_pl: 36.5, mass: 8.89, i_min: 3.01 },
  { name: 'Rp 140x80x3', type: 'RP', h: 140, b: 80, t: 3, A: 12.5, I: 263, W_pl: 45.4, mass: 9.82, i_min: 2.96 },
  { name: 'Rp 160x80x3', type: 'RP', h: 160, b: 80, t: 3, A: 13.7, I: 367, W_pl: 55.7, mass: 10.8, i_min: 2.91 },
  { name: 'Rp 160x80x4', type: 'RP', h: 160, b: 80, t: 4, A: 17.9, I: 464, W_pl: 71.6, mass: 14.0, i_min: 2.84 },
];

/**
 * Square tubes for truss chords
 * Values from EN 10210-2
 * i_min = minimum radius of gyration (cm), for SHS: i_min = sqrt(I/A)
 */
export const trussChordProfiles: SteelProfile[] = [
  { name: 'TUBE 80x80x4', type: 'TUBE', h: 80, b: 80, t: 4, A: 11.7, I: 113, W_pl: 34.2, mass: 9.22, i_min: 3.11 },
  { name: 'TUBE 100x100x4', type: 'TUBE', h: 100, b: 100, t: 4, A: 14.9, I: 231, W_pl: 55.8, mass: 11.7, i_min: 3.94 },
  { name: 'TUBE 120x120x5', type: 'TUBE', h: 120, b: 120, t: 5, A: 22.4, I: 494, W_pl: 100, mass: 17.5, i_min: 4.70 },
  { name: 'TUBE 140x140x5', type: 'TUBE', h: 140, b: 140, t: 5, A: 26.4, I: 802, W_pl: 138, mass: 20.7, i_min: 5.51 },
  { name: 'TUBE 150x150x6', type: 'TUBE', h: 150, b: 150, t: 6, A: 33.6, I: 1139, W_pl: 185, mass: 26.4, i_min: 5.82 },
];

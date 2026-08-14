import type { SteelProfile } from '../types';

/**
 * IPE profiles catalog (European I-beam standard)
 * Values from Euronorm 19-57 / EN 10034
 */
export const ipeProfiles: SteelProfile[] = [
  { name: 'IPE 80', type: 'IPE', h: 80, b: 46, tw: 3.8, tf: 5.2, A: 7.64, I: 80.1, W_pl: 23.2, mass: 6.0 },
  { name: 'IPE 100', type: 'IPE', h: 100, b: 55, tw: 4.1, tf: 5.7, A: 10.3, I: 171, W_pl: 39.4, mass: 8.1 },
  { name: 'IPE 120', type: 'IPE', h: 120, b: 64, tw: 4.4, tf: 6.3, A: 13.2, I: 318, W_pl: 60.7, mass: 10.4 },
  { name: 'IPE 140', type: 'IPE', h: 140, b: 73, tw: 4.7, tf: 6.9, A: 16.4, I: 541, W_pl: 88.3, mass: 12.9 },
  { name: 'IPE 160', type: 'IPE', h: 160, b: 82, tw: 5.0, tf: 7.4, A: 20.1, I: 869, W_pl: 124, mass: 15.8 },
  { name: 'IPE 180', type: 'IPE', h: 180, b: 91, tw: 5.3, tf: 8.0, A: 23.9, I: 1317, W_pl: 166, mass: 18.8 },
  { name: 'IPE 200', type: 'IPE', h: 200, b: 100, tw: 5.6, tf: 8.5, A: 28.5, I: 1943, W_pl: 221, mass: 22.4 },
  { name: 'IPE 220', type: 'IPE', h: 220, b: 110, tw: 5.9, tf: 9.2, A: 33.4, I: 2772, W_pl: 285, mass: 26.2 },
  { name: 'IPE 240', type: 'IPE', h: 240, b: 120, tw: 6.2, tf: 9.8, A: 39.1, I: 3892, W_pl: 367, mass: 30.7 },
  { name: 'IPE 270', type: 'IPE', h: 270, b: 135, tw: 6.6, tf: 10.2, A: 45.9, I: 5790, W_pl: 484, mass: 36.1 },
  { name: 'IPE 300', type: 'IPE', h: 300, b: 150, tw: 7.1, tf: 10.7, A: 53.8, I: 8356, W_pl: 628, mass: 42.2 },
  { name: 'IPE 330', type: 'IPE', h: 330, b: 160, tw: 7.5, tf: 11.5, A: 62.6, I: 11770, W_pl: 804, mass: 49.1 },
  { name: 'IPE 360', type: 'IPE', h: 360, b: 170, tw: 8.0, tf: 12.7, A: 72.7, I: 16270, W_pl: 1019, mass: 57.1 },
  { name: 'IPE 400', type: 'IPE', h: 400, b: 180, tw: 8.6, tf: 13.5, A: 84.5, I: 23130, W_pl: 1307, mass: 66.3 },
  { name: 'IPE 450', type: 'IPE', h: 450, b: 190, tw: 9.4, tf: 14.6, A: 98.8, I: 33740, W_pl: 1702, mass: 77.6 },
  { name: 'IPE 500', type: 'IPE', h: 500, b: 200, tw: 10.2, tf: 16.0, A: 116, I: 48200, W_pl: 2194, mass: 90.7 },
  { name: 'IPE 550', type: 'IPE', h: 550, b: 210, tw: 11.1, tf: 17.2, A: 134, I: 67120, W_pl: 2788, mass: 106 },
  { name: 'IPE 600', type: 'IPE', h: 600, b: 220, tw: 12.0, tf: 19.0, A: 156, I: 92080, W_pl: 3512, mass: 122 },
];

/**
 * RHS/SHS profiles (Rectangular/Square Hollow Sections)
 * Values from EN 10210-2
 */
export const rhsProfiles: SteelProfile[] = [
  { name: 'SHS 60x60x3', type: 'RHS', h: 60, b: 60, t: 3, A: 6.56, I: 34.2, W_pl: 13.6, mass: 5.15 },
  { name: 'SHS 80x80x4', type: 'RHS', h: 80, b: 80, t: 4, A: 11.7, I: 113, W_pl: 34.2, mass: 9.22 },
  { name: 'SHS 100x100x4', type: 'RHS', h: 100, b: 100, t: 4, A: 14.9, I: 231, W_pl: 55.8, mass: 11.7 },
  { name: 'SHS 120x120x5', type: 'RHS', h: 120, b: 120, t: 5, A: 22.4, I: 494, W_pl: 100, mass: 17.5 },
  { name: 'SHS 140x140x5', type: 'RHS', h: 140, b: 140, t: 5, A: 26.4, I: 802, W_pl: 138, mass: 20.7 },
  { name: 'SHS 150x150x6', type: 'RHS', h: 150, b: 150, t: 6, A: 33.6, I: 1139, W_pl: 185, mass: 26.4 },
  { name: 'SHS 160x160x6', type: 'RHS', h: 160, b: 160, t: 6, A: 36.0, I: 1403, W_pl: 213, mass: 28.3 },
  { name: 'SHS 180x180x6', type: 'RHS', h: 180, b: 180, t: 6, A: 40.8, I: 2044, W_pl: 276, mass: 32.0 },
  { name: 'SHS 200x200x8', type: 'RHS', h: 200, b: 200, t: 8, A: 59.2, I: 3598, W_pl: 441, mass: 46.5 },
];

/**
 * Z profiles (cold-formed purlins)
 * Typical values for structural Z purlins
 */
export const zProfiles: SteelProfile[] = [
  { name: 'Z140', type: 'Z', h: 140, b: 60, b_f: 60, t: 1.5, A: 4.09, I: 129, W_pl: 21.5, mass: 3.21, load_capacity: 2.5 },
  { name: 'Z160', type: 'Z', h: 160, b: 65, b_f: 65, t: 1.5, A: 4.55, I: 185, W_pl: 27.0, mass: 3.57, load_capacity: 3.2 },
  { name: 'Z180', type: 'Z', h: 180, b: 70, b_f: 70, t: 2.0, A: 6.28, I: 311, W_pl: 40.2, mass: 4.93, load_capacity: 4.5 },
  { name: 'Z200', type: 'Z', h: 200, b: 75, b_f: 75, t: 2.0, A: 6.88, I: 419, W_pl: 48.8, mass: 5.40, load_capacity: 5.5 },
  { name: 'Z250', type: 'Z', h: 250, b: 80, b_f: 80, t: 2.5, A: 10.0, I: 907, W_pl: 84.5, mass: 7.85, load_capacity: 8.0 },
  { name: 'Z300', type: 'Z', h: 300, b: 90, b_f: 90, t: 3.0, A: 14.1, I: 1770, W_pl: 137, mass: 11.1, load_capacity: 11.0 },
];

/**
 * Square tubes for truss chords
 * Values from EN 10210-2
 */
export const trussChordProfiles: SteelProfile[] = [
  { name: 'TUBE 80x80x4', type: 'TUBE', h: 80, b: 80, t: 4, A: 11.7, I: 113, W_pl: 34.2, mass: 9.22 },
  { name: 'TUBE 100x100x4', type: 'TUBE', h: 100, b: 100, t: 4, A: 14.9, I: 231, W_pl: 55.8, mass: 11.7 },
  { name: 'TUBE 120x120x5', type: 'TUBE', h: 120, b: 120, t: 5, A: 22.4, I: 494, W_pl: 100, mass: 17.5 },
  { name: 'TUBE 140x140x5', type: 'TUBE', h: 140, b: 140, t: 5, A: 26.4, I: 802, W_pl: 138, mass: 20.7 },
  { name: 'TUBE 150x150x6', type: 'TUBE', h: 150, b: 150, t: 6, A: 33.6, I: 1139, W_pl: 185, mass: 26.4 },
];

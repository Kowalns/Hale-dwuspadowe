/** Snow zone characteristic loads in kN/m2 (PN-EN 1991-1-3) */
export const snowZoneLoads: Record<number, number> = {
  1: 0.7,
  2: 0.9,
  3: 1.2,
  4: 1.6,
  5: 2.0,
};

/** Wind zone base pressure in kN/m2 (PN-EN 1991-1-4) */
export const windZoneLoads: Record<number, number> = {
  1: 0.3,
  2: 0.45,
  3: 0.55,
};

/** Covering self-weight in kN/m2 */
export const coveringSelfWeight: Record<string, number> = {
  sheet: 0.15,
  sandwich: 0.25,
};

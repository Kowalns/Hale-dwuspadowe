/** Snow zone characteristic loads Sk in kN/m2 (PN-EN 1991-1-3) */
export const snowZoneLoads: Record<number, number> = {
  1: 0.7,
  2: 0.9,
  3: 1.2,
  4: 1.6,
  5: 2.0,
};

/**
 * Wind zone base pressure qk in kN/m2 (PN-EN 1991-1-4)
 * qk = 0.5 * rho * vb^2 / 1000, rho = 1.25 kg/m3
 * Zone 1: vb = 22 m/s -> qk = 0.303 kN/m2
 * Zone 2: vb = 26 m/s -> qk = 0.423 kN/m2
 * Zone 3: vb = 30 m/s -> qk = 0.563 kN/m2
 */
export const windZoneLoads: Record<number, number> = {
  1: 0.303,
  2: 0.423,
  3: 0.563,
};

/** Base wind velocities vb in m/s per zone */
export const windZoneVelocities: Record<number, number> = {
  1: 22,
  2: 26,
  3: 30,
};

/** Covering self-weight in kN/m2 */
export const coveringSelfWeight: Record<string, number> = {
  sheet: 0.15,
  sandwich: 0.25,
};

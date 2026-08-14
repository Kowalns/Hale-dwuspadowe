export type SteelGrade = 'S235' | 'S355';
export type CoveringType = 'sheet' | 'sandwich';

export interface HallParameters {
  span: number; // 10-30m
  length: number; // 20-100m
  wallHeight: number; // 4-10m
  roofAngle: number; // 5-25 degrees
  steelGrade: SteelGrade;
  snowZone: number; // 1-5
  windZone: number; // 1-3
  coveringType: CoveringType;
}

export interface SteelProfile {
  name: string;
  type: 'IPE' | 'RHS' | 'Z' | 'TUBE';
  W_pl: number; // cm3
  I: number; // cm4
  A: number; // cm2
  mass: number; // kg/m
  h: number; // mm
  b: number; // mm
  tw?: number; // mm (web thickness)
  tf?: number; // mm (flange thickness)
  t?: number; // mm (wall thickness for tubes/RHS)
  b_f?: number; // mm (flange width for Z profiles)
  load_capacity?: number; // kN/m (for Z profiles)
}

export interface CalculationResults {
  sideColumnProfile: SteelProfile;
  endColumnProfile: SteelProfile;
  rafterProfile: SteelProfile | null;
  trussChordProfile: SteelProfile | null;
  purlinProfile: SteelProfile;
  bracingDiameter: number; // mm
  columnSpacing: number; // m
  purlinSpacing: number; // m
  trussHeight: number | null; // m
  numberOfFrames: number;
  ridgeHeight: number; // m
}

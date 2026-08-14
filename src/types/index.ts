export type SteelGrade = 'S235' | 'S355';
export type CoveringType = 'sheet' | 'sandwich';
export type TerrainCategory = 1 | 2 | 3 | 4;
export type SnowExposure = 'windy' | 'normal' | 'sheltered';
export type RafterType = 'auto' | 'force_truss' | 'force_rafter';

export interface ProfileOverrides {
  sideColumn?: string;
  endColumn?: string;
  rafter?: string;
  trussChord?: string;
  purlin?: string;
}

export interface ConnectionPlateInfo {
  width: number; // mm
  height: number; // mm
  thickness: number; // mm
  mass: number; // kg per plate
  count: number;
  bolts: string; // description
}

export interface ConnectionPlateResults {
  basePlate: ConnectionPlateInfo;
  endPlate: ConnectionPlateInfo;
  ridgePlate: ConnectionPlateInfo;
  totalMass: number; // total kg for all plates
}

export interface HallParameters {
  span: number; // 10-30m
  length: number; // 20-100m
  wallHeight: number; // 4-10m
  roofAngle: number; // 5-25 degrees
  steelGrade: SteelGrade;
  snowZone: number; // 1-5
  windZone: number; // 1-3
  coveringType: CoveringType;
  terrainCategory?: TerrainCategory;
  snowExposure?: SnowExposure;
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
  i_y?: number; // cm (radius of gyration about strong axis)
  i_min?: number; // cm (minimum radius of gyration for tubes/RHS)
  It?: number; // cm4 (torsion constant - Saint Venant)
  Iw?: number; // cm6 (warping constant) x 10^3 for storage
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
  // Extended Eurocode results
  utilizationRatio: number; // governing utilization (0-1+)
  governingCombination: string; // e.g. "KOMB 1 (snow dominant)"
  governingCondition: string; // e.g. "stability" | "deflection" | "strength"
  steelMassPerM2: number; // kg/m2 of floor area
  columnDeflection: number; // mm
  columnDeflectionLimit: number; // mm
  rafterDeflection: number; // mm
  rafterDeflectionLimit: number; // mm
  deflectionCheck: boolean; // true = OK
  stabilityCheck: boolean; // true = OK
  // Connection plates
  connectionPlates: ConnectionPlateResults;
  totalSteelMass: number; // total kg including plates
  // Per-profile utilization ratios (set when overrides are active)
  endColumnUtilization?: number;
  rafterUtilization?: number;
  trussChordUtilization?: number;
  purlinUtilization?: number;
}

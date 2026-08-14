import { useMemo } from 'react';
import type { HallParameters, CalculationResults } from '../types';
import { calculateHallStructure } from '../utils/calculations';

/**
 * Custom hook that calculates structural profiles based on hall parameters.
 * Results are memoized and only recalculated when parameters change.
 */
export function useHallCalculations(params: HallParameters): CalculationResults {
  return useMemo(() => calculateHallStructure(params), [
    params.span,
    params.length,
    params.wallHeight,
    params.roofAngle,
    params.steelGrade,
    params.snowZone,
    params.windZone,
    params.coveringType,
    params.terrainCategory,
    params.snowExposure,
  ]);
}

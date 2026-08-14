import { useMemo } from 'react';
import type { HallParameters, CalculationResults, ProfileOverrides, RafterType } from '../types';
import { calculateHallStructure, calculateWithOverrides } from '../utils/calculations';

/**
 * Custom hook that calculates structural profiles based on hall parameters.
 * Results are memoized and only recalculated when parameters change.
 * Supports optional profile overrides, rafter type forcing, and custom truss height.
 */
export function useHallCalculations(
  params: HallParameters,
  overrides?: ProfileOverrides,
  rafterType?: RafterType,
  customTrussHeight?: number | null
): CalculationResults {
  return useMemo(() => {
    const hasOverrides = overrides && Object.values(overrides).some(v => v !== undefined);
    const hasRafterTypeOverride = rafterType && rafterType !== 'auto';
    const hasTrussHeight = customTrussHeight != null;

    if (hasOverrides || hasRafterTypeOverride || hasTrussHeight) {
      return calculateWithOverrides(
        params,
        overrides ?? {},
        rafterType ?? 'auto',
        customTrussHeight ?? null
      );
    }

    return calculateHallStructure(params);
  }, [
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
    params.purlinType,
    overrides?.sideColumn,
    overrides?.endColumn,
    overrides?.rafter,
    overrides?.trussChord,
    overrides?.purlin,
    overrides?.eaveBeam,
    overrides?.wallGirt,
    overrides?.gableGirt,
    overrides?.intermediateColumn,
    rafterType,
    customTrussHeight,
  ]);
}

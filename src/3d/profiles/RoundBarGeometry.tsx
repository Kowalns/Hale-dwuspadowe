import { useMemo } from 'react';
import * as THREE from 'three';

interface RoundBarGeometryProps {
  diameter: number; // in meters
  length: number;   // in meters
}

/**
 * Creates a cylinder geometry for bracing rods.
 * Cylinder is along the Y axis by default (use rotation to orient).
 */
export function useRoundBarGeometry({ diameter, length }: RoundBarGeometryProps): THREE.CylinderGeometry {
  return useMemo(() => {
    const radius = diameter / 2;
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 8);
    return geometry;
  }, [diameter, length]);
}

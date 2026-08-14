import { useMemo } from 'react';
import * as THREE from 'three';

interface SquareTubeGeometryProps {
  size: number;      // outer dimension in meters (square)
  thickness: number; // wall thickness in meters
  length: number;    // extrusion length in meters
}

/**
 * Creates a square hollow tube cross-section and extrudes along Z axis.
 * The cross-section is in the XY plane, centered at origin.
 */
export function useSquareTubeGeometry({ size, thickness, length }: SquareTubeGeometryProps): THREE.ExtrudeGeometry {
  return useMemo(() => {
    const half = size / 2;

    const outerShape = new THREE.Shape();
    outerShape.moveTo(-half, -half);
    outerShape.lineTo(half, -half);
    outerShape.lineTo(half, half);
    outerShape.lineTo(-half, half);
    outerShape.closePath();

    const innerHalf = half - thickness;

    if (innerHalf > 0) {
      const hole = new THREE.Path();
      hole.moveTo(-innerHalf, -innerHalf);
      hole.lineTo(innerHalf, -innerHalf);
      hole.lineTo(innerHalf, innerHalf);
      hole.lineTo(-innerHalf, innerHalf);
      hole.closePath();
      outerShape.holes.push(hole);
    }

    const geometry = new THREE.ExtrudeGeometry(outerShape, {
      depth: length,
      bevelEnabled: false,
    });

    geometry.computeVertexNormals();
    return geometry;
  }, [size, thickness, length]);
}

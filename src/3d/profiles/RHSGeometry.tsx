import { useMemo } from 'react';
import * as THREE from 'three';

interface RHSGeometryProps {
  width: number;     // outer width in meters
  height: number;    // outer height in meters
  thickness: number; // wall thickness in meters
  length: number;    // extrusion length in meters
}

/**
 * Creates a hollow rectangular section (RHS) cross-section and extrudes along Z axis.
 * The cross-section is in the XY plane, centered at origin.
 */
export function useRHSGeometry({ width, height, thickness, length }: RHSGeometryProps): THREE.ExtrudeGeometry {
  return useMemo(() => {
    const halfW = width / 2;
    const halfH = height / 2;

    const outerShape = new THREE.Shape();
    outerShape.moveTo(-halfW, -halfH);
    outerShape.lineTo(halfW, -halfH);
    outerShape.lineTo(halfW, halfH);
    outerShape.lineTo(-halfW, halfH);
    outerShape.closePath();

    const innerHalfW = halfW - thickness;
    const innerHalfH = halfH - thickness;

    if (innerHalfW > 0 && innerHalfH > 0) {
      const hole = new THREE.Path();
      hole.moveTo(-innerHalfW, -innerHalfH);
      hole.lineTo(innerHalfW, -innerHalfH);
      hole.lineTo(innerHalfW, innerHalfH);
      hole.lineTo(-innerHalfW, innerHalfH);
      hole.closePath();
      outerShape.holes.push(hole);
    }

    const geometry = new THREE.ExtrudeGeometry(outerShape, {
      depth: length,
      bevelEnabled: false,
    });

    geometry.computeVertexNormals();
    return geometry;
  }, [width, height, thickness, length]);
}

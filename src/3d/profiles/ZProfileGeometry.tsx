import { useMemo } from 'react';
import * as THREE from 'three';

interface ZProfileGeometryProps {
  h: number;      // web height in meters
  b_f: number;    // flange width in meters
  t: number;      // thickness in meters
  length: number; // extrusion length in meters
}

/**
 * Creates a Z-shaped cold-formed profile cross-section and extrudes along Z axis.
 * The cross-section is in the XY plane, centered at origin.
 * Z-profile: bottom flange goes right, top flange goes left.
 */
export function useZProfileGeometry({ h, b_f, t, length }: ZProfileGeometryProps): THREE.ExtrudeGeometry {
  return useMemo(() => {
    const halfH = h / 2;

    // Z-profile shape: bottom flange right, top flange left
    const shape = new THREE.Shape();
    // Start at bottom-left of web
    shape.moveTo(0, -halfH);
    // Bottom flange (extends right)
    shape.lineTo(b_f, -halfH);
    shape.lineTo(b_f, -halfH + t);
    shape.lineTo(t, -halfH + t);
    // Web right edge going up
    shape.lineTo(t, halfH);
    // Top flange (extends left)
    shape.lineTo(-b_f + t, halfH);
    shape.lineTo(-b_f + t, halfH - t);
    shape.lineTo(0, halfH - t);
    // Web left edge going down (close path)
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false,
    });

    geometry.computeVertexNormals();
    return geometry;
  }, [h, b_f, t, length]);
}

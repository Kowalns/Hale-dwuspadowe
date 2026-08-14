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

    const shape = new THREE.Shape();

    // Bottom flange (extends to the right)
    shape.moveTo(0, -halfH);
    shape.lineTo(b_f, -halfH);
    shape.lineTo(b_f, -halfH + t);
    shape.lineTo(t, -halfH + t);

    // Web (going up)
    shape.lineTo(t, halfH - t);

    // Top flange (extends to the left)
    shape.lineTo(0, halfH - t);
    shape.lineTo(-b_f + t, halfH - t);
    shape.lineTo(-b_f + t, halfH);
    shape.lineTo(-b_f + t, halfH); // same point
    shape.lineTo(0 - b_f + t, halfH);
    shape.lineTo(0 - b_f + t, halfH - t);

    // Redo: cleaner Z-profile shape
    const shape2 = new THREE.Shape();
    // Bottom flange: right side
    shape2.moveTo(0, -halfH);
    shape2.lineTo(b_f, -halfH);
    shape2.lineTo(b_f, -halfH + t);
    shape2.lineTo(t, -halfH + t);
    // Web going up
    shape2.lineTo(t, halfH - t);
    // Top flange: left side
    shape2.lineTo(0, halfH - t);
    shape2.lineTo(0, halfH);
    shape2.lineTo(-b_f + t, halfH);
    shape2.lineTo(-b_f + t, halfH - t);
    shape2.lineTo(0, halfH - t);
    // This creates a problem with self-intersection, let me do it properly

    // Clean implementation
    const s = new THREE.Shape();
    // Start at bottom-right of bottom flange
    s.moveTo(b_f, -halfH);
    s.lineTo(b_f, -halfH + t);
    s.lineTo(t, -halfH + t);
    s.lineTo(t, halfH - t);
    s.lineTo(0, halfH - t);
    s.lineTo(0, halfH);
    s.lineTo(-b_f + t, halfH);
    s.lineTo(-b_f + t, halfH - t);
    s.lineTo(0, halfH - t);
    // problem: duplicate point, let me restructure

    // Final clean Z-profile
    const zShape = new THREE.Shape();
    // Bottom flange (right-extending)
    zShape.moveTo(0, -halfH);
    zShape.lineTo(b_f, -halfH);
    zShape.lineTo(b_f, -halfH + t);
    zShape.lineTo(t, -halfH + t);
    // Web
    zShape.lineTo(t, halfH);
    // Top flange (left-extending)
    zShape.lineTo(-b_f + t, halfH);
    zShape.lineTo(-b_f + t, halfH - t);
    zShape.lineTo(0, halfH - t);
    // Web left side going back down
    zShape.lineTo(0, -halfH);

    const geometry = new THREE.ExtrudeGeometry(zShape, {
      depth: length,
      bevelEnabled: false,
    });

    geometry.computeVertexNormals();
    return geometry;
  }, [h, b_f, t, length]);
}

import { useMemo } from 'react';
import * as THREE from 'three';

interface IBeamGeometryProps {
  h: number;      // total height in meters
  b: number;      // flange width in meters
  tw: number;     // web thickness in meters
  tf: number;     // flange thickness in meters
  length: number; // extrusion length in meters
}

/**
 * Creates an I-beam (IPE) cross-section shape and extrudes it along the Z axis.
 * The cross-section is in the XY plane, centered at origin.
 */
export function useIBeamGeometry({ h, b, tw, tf, length }: IBeamGeometryProps): THREE.ExtrudeGeometry {
  return useMemo(() => {
    const halfH = h / 2;
    const halfB = b / 2;
    const halfTw = tw / 2;

    const shape = new THREE.Shape();

    // Start at bottom-left of bottom flange
    shape.moveTo(-halfB, -halfH);
    shape.lineTo(halfB, -halfH);
    shape.lineTo(halfB, -halfH + tf);
    shape.lineTo(halfTw, -halfH + tf);
    shape.lineTo(halfTw, halfH - tf);
    shape.lineTo(halfB, halfH - tf);
    shape.lineTo(halfB, halfH);
    shape.lineTo(-halfB, halfH);
    shape.lineTo(-halfB, halfH - tf);
    shape.lineTo(-halfTw, halfH - tf);
    shape.lineTo(-halfTw, -halfH + tf);
    shape.lineTo(-halfB, -halfH + tf);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false,
    });

    geometry.computeVertexNormals();
    return geometry;
  }, [h, b, tw, tf, length]);
}

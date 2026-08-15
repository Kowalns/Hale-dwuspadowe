import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useIBeamGeometry } from '../profiles/IBeamGeometry';
import { columnMaterial } from '../materials';
import type { SteelProfile } from '../../types';

interface SideColumnsProps {
  profile: SteelProfile;
  wallHeight: number;
  span: number;
  columnSpacing: number;
  numberOfFrames: number;
  roofAngle: number;
  columnFlangeOffset: number;
}

/**
 * Renders IPE side columns along both long walls (Z=0 and Z=span).
 * Columns are placed at each frame position along the X axis.
 * The top of each column is clipped at the roof angle using clipping planes.
 */
export const SideColumns = React.memo(function SideColumns({
  profile,
  wallHeight,
  span,
  columnSpacing,
  numberOfFrames,
  roofAngle,
  columnFlangeOffset,
}: SideColumnsProps) {
  // Convert mm to meters
  const h = profile.h / 1000;
  const b = profile.b / 1000;
  const tw = (profile.tw ?? 7) / 1000;
  const tf = (profile.tf ?? 11) / 1000;

  const geometry = useIBeamGeometry({ h, b, tw, tf, length: wallHeight });

  const roofAngleRad = (roofAngle * Math.PI) / 180;

  const leftClipMaterial = useMemo(() => {
    const normal = new THREE.Vector3(0, -Math.cos(roofAngleRad), Math.sin(roofAngleRad));
    const point = new THREE.Vector3(0, wallHeight, columnFlangeOffset);
    const constant = -normal.dot(point);
    const plane = new THREE.Plane(normal, constant);

    const mat = columnMaterial.clone();
    mat.clippingPlanes = [plane];
    mat.clipShadows = true;
    return mat;
  }, [wallHeight, roofAngleRad, columnFlangeOffset]);

  const rightClipMaterial = useMemo(() => {
    const normal = new THREE.Vector3(0, -Math.cos(roofAngleRad), -Math.sin(roofAngleRad));
    const point = new THREE.Vector3(0, wallHeight, span - columnFlangeOffset);
    const constant = -normal.dot(point);
    const plane = new THREE.Plane(normal, constant);

    const mat = columnMaterial.clone();
    mat.clippingPlanes = [plane];
    mat.clipShadows = true;
    return mat;
  }, [wallHeight, span, roofAngleRad, columnFlangeOffset]);

  const leftPositions = useMemo(() => {
    const pos: Array<number> = [];
    for (let i = 0; i < numberOfFrames; i++) {
      pos.push(i * columnSpacing);
    }
    return pos;
  }, [numberOfFrames, columnSpacing]);

  const rightPositions = useMemo(() => {
    const pos: Array<number> = [];
    for (let i = 0; i < numberOfFrames; i++) {
      pos.push(i * columnSpacing);
    }
    return pos;
  }, [numberOfFrames, columnSpacing]);

  return (
    <group name="side-columns">
      {/* Left side wall (Z=0) */}
      {leftPositions.map((x, i) => (
        <mesh
          key={`left-${i}`}
          geometry={geometry}
          material={leftClipMaterial}
          position={[x, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        />
      ))}
      {/* Right side wall (Z=span) */}
      {rightPositions.map((x, i) => (
        <mesh
          key={`right-${i}`}
          geometry={geometry}
          material={rightClipMaterial}
          position={[x, 0, span]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
});

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { bracingMaterial } from '../materials';

interface CrossBracingProps {
  wallHeight: number;
  span: number;
  ridgeHeight: number;
  columnSpacing: number;
  numberOfFrames: number;
  hallLength: number;
  bracingDiameter: number; // mm
}

/**
 * Diagonal X-bracing with round bars in first and last bay
 * on both roof slopes and side walls.
 */
export const CrossBracing = React.memo(function CrossBracing({
  wallHeight,
  span,
  ridgeHeight,
  columnSpacing,
  numberOfFrames,
  hallLength,
  bracingDiameter,
}: CrossBracingProps) {
  const radius = (bracingDiameter / 1000) / 2;

  const braces = useMemo(() => {
    const result: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

    // Only place bracing if we have at least 2 bays
    if (numberOfFrames < 1) return result;

    const firstBayStart = 0;
    const firstBayEnd = columnSpacing;
    const lastBayStart = hallLength - columnSpacing;
    const lastBayEnd = hallLength;

    const bays = numberOfFrames === 1
      ? [[firstBayStart, firstBayEnd]]
      : [[firstBayStart, firstBayEnd], [lastBayStart, lastBayEnd]];

    // Wall bracing - both side walls
    for (const [bayX0, bayX1] of bays) {
      // Z=0 side wall
      result.push({
        start: new THREE.Vector3(bayX0, 0, 0),
        end: new THREE.Vector3(bayX1, wallHeight, 0),
      });
      result.push({
        start: new THREE.Vector3(bayX1, 0, 0),
        end: new THREE.Vector3(bayX0, wallHeight, 0),
      });
      // Z=span side wall
      result.push({
        start: new THREE.Vector3(bayX0, 0, span),
        end: new THREE.Vector3(bayX1, wallHeight, span),
      });
      result.push({
        start: new THREE.Vector3(bayX1, 0, span),
        end: new THREE.Vector3(bayX0, wallHeight, span),
      });
    }

    // Roof bracing - both slopes, first and last bay
    const halfSpan = span / 2;

    for (const [bayX0, bayX1] of bays) {
      // Left roof slope
      result.push({
        start: new THREE.Vector3(bayX0, wallHeight, 0),
        end: new THREE.Vector3(bayX1, (wallHeight + ridgeHeight) / 2, halfSpan / 2),
      });
      result.push({
        start: new THREE.Vector3(bayX1, wallHeight, 0),
        end: new THREE.Vector3(bayX0, (wallHeight + ridgeHeight) / 2, halfSpan / 2),
      });

      // Right roof slope
      result.push({
        start: new THREE.Vector3(bayX0, wallHeight, span),
        end: new THREE.Vector3(bayX1, (wallHeight + ridgeHeight) / 2, span - halfSpan / 2),
      });
      result.push({
        start: new THREE.Vector3(bayX1, wallHeight, span),
        end: new THREE.Vector3(bayX0, (wallHeight + ridgeHeight) / 2, span - halfSpan / 2),
      });
    }

    return result;
  }, [wallHeight, span, ridgeHeight, columnSpacing, numberOfFrames, hallLength]);

  return (
    <group name="cross-bracing">
      {braces.map((brace, i) => (
        <BracingRod
          key={i}
          start={brace.start}
          end={brace.end}
          radius={radius}
        />
      ))}
    </group>
  );
});

interface BracingRodProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
}

function BracingRod({ start, end, radius }: BracingRodProps) {
  const { position, quaternion, rodLength } = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(end, start);
    const len = direction.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    const dir = direction.normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(up, dir);

    return {
      position: mid,
      quaternion: quat,
      rodLength: len,
    };
  }, [start, end]);

  return (
    <mesh
      position={position}
      quaternion={quaternion}
      castShadow
      receiveShadow
      material={bracingMaterial}
    >
      <cylinderGeometry args={[radius, radius, rodLength, 8]} />
    </mesh>
  );
}

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
  hallLength,
  bracingDiameter,
}: CrossBracingProps) {
  const radius = (bracingDiameter / 1000) / 2;

  const braces = useMemo(() => {
    const result: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

    const firstBayStart = 0;
    const firstBayEnd = columnSpacing;
    const lastBayStart = hallLength - columnSpacing;
    const lastBayEnd = hallLength;

    const bays = [
      [firstBayStart, firstBayEnd],
      [lastBayStart, lastBayEnd],
    ];

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
    // Proper X-pattern: two diagonals spanning opposite corners of each bay panel on the roof
    const halfSpan = span / 2;

    for (const [bayX0, bayX1] of bays) {
      // Left roof slope - corners at eave (wallHeight, Z=0) and ridge (ridgeHeight, Z=halfSpan)
      const leftEaveY = wallHeight;
      const leftEaveZ = 0;
      const leftRidgeY = ridgeHeight;
      const leftRidgeZ = halfSpan;

      // Diagonal 1: (bayX0, eave) to (bayX1, ridge)
      result.push({
        start: new THREE.Vector3(bayX0, leftEaveY, leftEaveZ),
        end: new THREE.Vector3(bayX1, leftRidgeY, leftRidgeZ),
      });
      // Diagonal 2: (bayX1, eave) to (bayX0, ridge)
      result.push({
        start: new THREE.Vector3(bayX1, leftEaveY, leftEaveZ),
        end: new THREE.Vector3(bayX0, leftRidgeY, leftRidgeZ),
      });

      // Right roof slope - corners at eave (wallHeight, Z=span) and ridge (ridgeHeight, Z=halfSpan)
      const rightEaveY = wallHeight;
      const rightEaveZ = span;
      const rightRidgeY = ridgeHeight;
      const rightRidgeZ = halfSpan;

      // Diagonal 1: (bayX0, eave) to (bayX1, ridge)
      result.push({
        start: new THREE.Vector3(bayX0, rightEaveY, rightEaveZ),
        end: new THREE.Vector3(bayX1, rightRidgeY, rightRidgeZ),
      });
      // Diagonal 2: (bayX1, eave) to (bayX0, ridge)
      result.push({
        start: new THREE.Vector3(bayX1, rightEaveY, rightEaveZ),
        end: new THREE.Vector3(bayX0, rightRidgeY, rightRidgeZ),
      });
    }

    return result;
  }, [wallHeight, span, ridgeHeight, columnSpacing, hallLength]);

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
  const { position, rotation, rodLength } = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(end, start);
    const len = direction.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // Align cylinder (Y-axis default) with the direction
    const dir = direction.normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, dir);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      position: [mid.x, mid.y, mid.z] as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      rodLength: len,
    };
  }, [start, end]);

  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
      material={bracingMaterial}
    >
      <cylinderGeometry args={[radius, radius, rodLength, 8]} />
    </mesh>
  );
}

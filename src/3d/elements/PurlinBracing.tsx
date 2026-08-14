import React, { useMemo } from 'react';
import * as THREE from 'three';
import { bracingMaterial } from '../materials';

interface PurlinBracingProps {
  wallHeight: number;
  purlinBaseY: number;
  span: number;
  roofAngle: number;
  purlinSpacing: number;
  columnSpacing: number;
  numberOfFrames: number;
}

/**
 * Purlin bracing (40x20x2mm profiles) connecting adjacent purlins along the roof slope.
 * Each brace runs from one purlin to the next (along Z direction on the slope),
 * placed at the midpoint between frames (mid-bay X position).
 * Also includes braces from eave beam to first purlin and between the two ridge purlins.
 */
export const PurlinBracing = React.memo(function PurlinBracing({
  wallHeight,
  purlinBaseY,
  span,
  roofAngle,
  purlinSpacing,
  columnSpacing,
  numberOfFrames,
}: PurlinBracingProps) {
  const roofAngleRad = (roofAngle * Math.PI) / 180;
  const halfSpan = span / 2;
  const slopeLength = halfSpan / Math.cos(roofAngleRad);

  // Compute all purlin positions along the slope (same logic as Purlins.tsx)
  const bracingElements = useMemo(() => {
    const result: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];

    // Compute purlin distances along slope
    const ridgeOffset = Math.min(purlinSpacing / 2, 0.2);
    const minDistFromRidge = purlinSpacing / 4;
    const slopePositions: number[] = [];
    const numPurlins = Math.floor(slopeLength / purlinSpacing);

    for (let i = 1; i <= numPurlins; i++) {
      const distAlongSlope = i * purlinSpacing;
      if (slopeLength - distAlongSlope < minDistFromRidge) {
        continue;
      }
      if (distAlongSlope < slopeLength) {
        slopePositions.push(distAlongSlope);
      }
    }

    // Add near-ridge purlin
    const nearRidgeDist = slopeLength - ridgeOffset;
    if (nearRidgeDist > 0 && (slopePositions.length === 0 || nearRidgeDist - slopePositions[slopePositions.length - 1] > minDistFromRidge)) {
      slopePositions.push(nearRidgeDist);
    }

    // Convert slope positions to Y,Z coords for each side
    // Left slope: Z goes from 0 (eave) towards halfSpan (ridge)
    // Right slope: Z goes from span (eave) towards halfSpan (ridge)

    const leftPurlinPositions: Array<{ y: number; z: number }> = [];
    const rightPurlinPositions: Array<{ y: number; z: number }> = [];

    for (const dist of slopePositions) {
      const horizontalDist = dist * Math.cos(roofAngleRad);
      const verticalDist = dist * Math.sin(roofAngleRad);

      if (horizontalDist < halfSpan) {
        leftPurlinPositions.push({
          y: purlinBaseY + verticalDist,
          z: horizontalDist,
        });
        rightPurlinPositions.push({
          y: purlinBaseY + verticalDist,
          z: span - horizontalDist,
        });
      }
    }

    // Eave beam position (at Z=0 for left, Z=span for right, Y=wallHeight)
    const eaveLeft = { y: wallHeight, z: 0 };
    const eaveRight = { y: wallHeight, z: span };

    // Build full list of points for each slope (eave + purlins)
    const leftPoints = [eaveLeft, ...leftPurlinPositions];
    const rightPoints = [eaveRight, ...rightPurlinPositions];

    // Compute mid-bay X positions
    const midXPositions: number[] = [];
    for (let frame = 0; frame < numberOfFrames - 1; frame++) {
      midXPositions.push((frame + 0.5) * columnSpacing);
    }

    // Create bracing between consecutive points (eave->first purlin, purlin->purlin)
    for (const midX of midXPositions) {
      // Left slope bracing
      for (let i = 0; i < leftPoints.length - 1; i++) {
        const p1 = leftPoints[i];
        const p2 = leftPoints[i + 1];
        result.push({
          start: new THREE.Vector3(midX, p1.y, p1.z),
          end: new THREE.Vector3(midX, p2.y, p2.z),
        });
      }

      // Right slope bracing
      for (let i = 0; i < rightPoints.length - 1; i++) {
        const p1 = rightPoints[i];
        const p2 = rightPoints[i + 1];
        result.push({
          start: new THREE.Vector3(midX, p1.y, p1.z),
          end: new THREE.Vector3(midX, p2.y, p2.z),
        });
      }

      // Ridge bracing: connect the two near-ridge purlins (left and right slopes)
      if (leftPurlinPositions.length > 0 && rightPurlinPositions.length > 0) {
        const lastLeft = leftPurlinPositions[leftPurlinPositions.length - 1];
        const lastRight = rightPurlinPositions[rightPurlinPositions.length - 1];
        result.push({
          start: new THREE.Vector3(midX, lastLeft.y, lastLeft.z),
          end: new THREE.Vector3(midX, lastRight.y, lastRight.z),
        });
      }
    }

    return result;
  }, [slopeLength, purlinSpacing, roofAngleRad, halfSpan, wallHeight, purlinBaseY, span, numberOfFrames, columnSpacing]);

  // Bracing rod radius: 40x20mm profile approximated as cylinder with 20mm diameter
  const bracingRadius = 0.01;

  return (
    <group name="purlin-bracing">
      {bracingElements.map((brace, i) => (
        <BracingMember
          key={i}
          start={brace.start}
          end={brace.end}
          radius={bracingRadius}
        />
      ))}
    </group>
  );
});

interface BracingMemberProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
}

function BracingMember({ start, end, radius }: BracingMemberProps) {
  const { position, rotation, memberLength } = useMemo(() => {
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
      memberLength: len,
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
      <cylinderGeometry args={[radius, radius, memberLength, 6]} />
    </mesh>
  );
}

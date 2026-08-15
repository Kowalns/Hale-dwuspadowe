import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { HallParameters, Opening, WallIdentifier } from '../../types';

interface OpeningsProps {
  params: HallParameters;
  openings: Opening[];
}

/**
 * Computes the 3D position and rotation of an opening on its wall.
 */
function getOpeningTransform(
  opening: Opening,
  params: HallParameters
): { position: [number, number, number]; rotation: [number, number, number] } {
  const { span, length: hallLength } = params;
  const wallOffset = 0.02; // offset from wall surface to avoid z-fighting

  switch (opening.wall) {
    case 'side_left':
      // Z=0 face, looking from -Z
      return {
        position: [opening.positionX, opening.positionY, -wallOffset],
        rotation: [0, 0, 0],
      };
    case 'side_right':
      // Z=span face, looking from +Z
      return {
        position: [hallLength - opening.positionX, opening.positionY, span + wallOffset],
        rotation: [0, Math.PI, 0],
      };
    case 'end_front':
      // X=0 face, looking from -X
      return {
        position: [-wallOffset, opening.positionY, opening.positionX],
        rotation: [0, Math.PI / 2, 0],
      };
    case 'end_back':
      // X=hallLength face, looking from +X
      return {
        position: [hallLength + wallOffset, opening.positionY, span - opening.positionX],
        rotation: [0, -Math.PI / 2, 0],
      };
  }
}

/**
 * Dark cutout material for opening visualization.
 */
const cutoutMaterial = new THREE.MeshStandardMaterial({
  color: '#1a1a2e',
  transparent: true,
  opacity: 0.92,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const detailMaterial = new THREE.MeshStandardMaterial({
  color: '#444466',
  side: THREE.DoubleSide,
});

/**
 * Renders a single opening with type-specific decorations.
 */
function OpeningMesh({ opening, params }: { opening: Opening; params: HallParameters }) {
  const { position, rotation } = useMemo(
    () => getOpeningTransform(opening, params),
    [opening, params]
  );

  const { width, height, type } = opening;

  return (
    <group position={position} rotation={rotation}>
      {/* Dark rectangle (cutout) */}
      <mesh material={cutoutMaterial}>
        <planeGeometry args={[width, height]} />
      </mesh>

      {/* Type-specific decorations */}
      {type === 'sliding_gate' && <SlidingGateDetail width={width} height={height} />}
      {type === 'sectional_gate' && <SectionalGateDetail width={width} height={height} />}
      {type === 'door' && <DoorDetail width={width} height={height} />}
      {type === 'window' && <WindowDetail width={width} height={height} />}
    </group>
  );
}

/**
 * Sliding gate: rail at the top.
 */
function SlidingGateDetail({ width, height }: { width: number; height: number }) {
  const railHeight = 0.06;
  const railDepth = 0.04;
  return (
    <mesh
      position={[0, height / 2 + railHeight / 2, railDepth / 2]}
      material={detailMaterial}
    >
      <boxGeometry args={[width * 1.15, railHeight, railDepth]} />
    </mesh>
  );
}

/**
 * Sectional (panel) gate: horizontal segment lines.
 */
function SectionalGateDetail({ width, height }: { width: number; height: number }) {
  const segmentCount = Math.max(3, Math.round(height / 0.5));
  const segmentSpacing = height / segmentCount;
  const lineThickness = 0.02;

  const lines = useMemo(() => {
    const arr: number[] = [];
    for (let i = 1; i < segmentCount; i++) {
      arr.push(-height / 2 + i * segmentSpacing);
    }
    return arr;
  }, [segmentCount, segmentSpacing, height]);

  return (
    <>
      {lines.map((y, idx) => (
        <mesh key={idx} position={[0, y, 0.005]} material={detailMaterial}>
          <boxGeometry args={[width - 0.04, lineThickness, 0.01]} />
        </mesh>
      ))}
    </>
  );
}

/**
 * Door: frame border (4 thin boxes).
 */
function DoorDetail({ width, height }: { width: number; height: number }) {
  const frameWidth = 0.05;
  const frameDepth = 0.02;

  return (
    <>
      {/* Top frame */}
      <mesh position={[0, height / 2 - frameWidth / 2, frameDepth / 2]} material={detailMaterial}>
        <boxGeometry args={[width, frameWidth, frameDepth]} />
      </mesh>
      {/* Bottom frame */}
      <mesh position={[0, -height / 2 + frameWidth / 2, frameDepth / 2]} material={detailMaterial}>
        <boxGeometry args={[width, frameWidth, frameDepth]} />
      </mesh>
      {/* Left frame */}
      <mesh position={[-width / 2 + frameWidth / 2, 0, frameDepth / 2]} material={detailMaterial}>
        <boxGeometry args={[frameWidth, height, frameDepth]} />
      </mesh>
      {/* Right frame */}
      <mesh position={[width / 2 - frameWidth / 2, 0, frameDepth / 2]} material={detailMaterial}>
        <boxGeometry args={[frameWidth, height, frameDepth]} />
      </mesh>
    </>
  );
}

/**
 * Window: cross dividers (horizontal + vertical center lines).
 */
function WindowDetail({ width, height }: { width: number; height: number }) {
  const barWidth = 0.03;
  const barDepth = 0.015;

  return (
    <>
      {/* Horizontal center bar */}
      <mesh position={[0, 0, barDepth / 2]} material={detailMaterial}>
        <boxGeometry args={[width - 0.02, barWidth, barDepth]} />
      </mesh>
      {/* Vertical center bar */}
      <mesh position={[0, 0, barDepth / 2]} material={detailMaterial}>
        <boxGeometry args={[barWidth, height - 0.02, barDepth]} />
      </mesh>
      {/* Frame */}
      <DoorDetail width={width} height={height} />
    </>
  );
}

/**
 * Helper to compute wall dimensions.
 */
export function getWallDimensions(
  wall: WallIdentifier,
  params: HallParameters
): { width: number; height: number } {
  const { span, length: hallLength, wallHeight } = params;
  switch (wall) {
    case 'side_left':
    case 'side_right':
      return { width: hallLength, height: wallHeight };
    case 'end_front':
    case 'end_back':
      return { width: span, height: wallHeight };
  }
}

/**
 * Checks if two openings overlap (AABB collision in 2D local wall coords).
 */
export function checkCollision(a: Opening, b: Opening): boolean {
  if (a.wall !== b.wall) return false;

  const aLeft = a.positionX - a.width / 2;
  const aRight = a.positionX + a.width / 2;
  const aBottom = a.positionY - a.height / 2;
  const aTop = a.positionY + a.height / 2;

  const bLeft = b.positionX - b.width / 2;
  const bRight = b.positionX + b.width / 2;
  const bBottom = b.positionY - b.height / 2;
  const bTop = b.positionY + b.height / 2;

  return aLeft < bRight && aRight > bLeft && aBottom < bTop && aTop > bBottom;
}

/**
 * Checks if an opening fits within the wall bounds.
 */
export function fitsInWall(opening: Opening, params: HallParameters): boolean {
  const { width: wallWidth, height: wallHeight } = getWallDimensions(opening.wall, params);
  const left = opening.positionX - opening.width / 2;
  const right = opening.positionX + opening.width / 2;
  const bottom = opening.positionY - opening.height / 2;
  const top = opening.positionY + opening.height / 2;

  return left >= 0 && right <= wallWidth && bottom >= 0 && top <= wallHeight;
}

/**
 * Openings component rendering all openings from the array.
 */
export const Openings = React.memo(function Openings({ params, openings }: OpeningsProps) {
  if (openings.length === 0) return null;

  return (
    <group name="openings">
      {openings.map((opening) => (
        <OpeningMesh key={opening.id} opening={opening} params={params} />
      ))}
    </group>
  );
});

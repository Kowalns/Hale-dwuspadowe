import React, { useMemo } from 'react';
import { columnMaterial } from '../materials';
import type { HallParameters, Opening } from '../../types';

// Gate frame profile: RHS 100x100x4 in meters
const GATE_PROFILE_W = 0.100;
const GATE_PROFILE_H = 0.100;
// Lintel: 2 horizontal beams at 450mm outside-to-outside spacing
export const LINTEL_HEIGHT = 0.450;
// Number of vertical posts in lintel
const LINTEL_POSTS = 4;

interface GateFrameProps {
  openings: Opening[];
  params: HallParameters;
}

/**
 * Renders structural gate frames (2 columns + lintel) for sectional and sliding gates.
 * Gate columns are RHS 100x100x4 from floor to bottom of lintel.
 * Lintel: 2 horizontal RHS beams (450mm apart outside-to-outside) + 4 vertical posts between them.
 * Uses boxGeometry for simplicity per requirements.
 */
export const GateFrame = React.memo(function GateFrame({
  openings,
  params,
}: GateFrameProps) {
  const { span, length: hallLength } = params;

  // Filter gate openings only
  const gateOpenings = useMemo(
    () => openings.filter((o) => o.type === 'sectional_gate' || o.type === 'sliding_gate'),
    [openings]
  );

  if (gateOpenings.length === 0) return null;

  return (
    <group name="gate-frames">
      {gateOpenings.map((opening) => (
        <SingleGateFrame
          key={opening.id}
          opening={opening}
          span={span}
          hallLength={hallLength}
        />
      ))}
    </group>
  );
});

interface SingleGateFrameProps {
  opening: Opening;
  span: number;
  hallLength: number;
}

function SingleGateFrame({ opening, span, hallLength }: SingleGateFrameProps) {
  const { wall, width: gateWidth, height: gateHeight, positionX } = opening;

  // Compute world position based on wall
  const position = useMemo(() => {
    const halfW = gateWidth / 2;
    let x = 0;
    let z = 0;

    if (wall === 'side_left') {
      x = positionX;
      z = 0;
    } else if (wall === 'side_right') {
      x = hallLength - positionX;
      z = span;
    } else if (wall === 'end_front') {
      x = 0;
      z = span - positionX;
    } else if (wall === 'end_back') {
      x = hallLength;
      z = positionX;
    }

    return { x, z, halfW };
  }, [wall, positionX, gateWidth, span, hallLength]);

  // Column height = gate opening height (lintel sits above)
  const columnHeight = gateHeight;
  // Lintel bottom Y = gate height
  const lintelBottomY = gateHeight;

  // Determine orientation: side walls run along X, end walls run along Z
  const isSideWall = wall === 'side_left' || wall === 'side_right';

  // For side walls, check that the gate fits in the bay
  // For positioning: gate columns at +/- gateWidth/2 from center
  const leftColOffset = -position.halfW;
  const rightColOffset = position.halfW;

  // Lintel beam length = distance between outer edges of columns
  const lintelLength = gateWidth;

  // Post height = distance between inner faces of lintel beams = 450 - 2*100 = 250mm
  const postInnerHeight = LINTEL_HEIGHT - 2 * GATE_PROFILE_H;

  return (
    <group>
      {/* Left gate column */}
      <GateColumn
        x={position.x + (isSideWall ? leftColOffset : 0)}
        y={0}
        z={position.z + (isSideWall ? 0 : leftColOffset)}
        height={columnHeight}
        isSideWall={isSideWall}
      />
      {/* Right gate column */}
      <GateColumn
        x={position.x + (isSideWall ? rightColOffset : 0)}
        y={0}
        z={position.z + (isSideWall ? 0 : rightColOffset)}
        height={columnHeight}
        isSideWall={isSideWall}
      />
      {/* Lintel assembly */}
      <LintelAssembly
        x={position.x}
        z={position.z}
        lintelBottomY={lintelBottomY}
        lintelLength={lintelLength}
        postInnerHeight={postInnerHeight}
        isSideWall={isSideWall}
      />
    </group>
  );
}

interface GateColumnProps {
  x: number;
  y: number;
  z: number;
  height: number;
  isSideWall: boolean;
}

function GateColumn({ x, y, z, height, isSideWall }: GateColumnProps) {
  // Column rendered as a box for simplicity (RHS 100x100)
  // Oriented vertically (Y axis)
  // For side wall: profile is flat on X-Z plane (100mm along Z, 100mm along X)
  // For end wall: same but rotated
  return (
    <mesh
      position={[x, y + height / 2, z]}
      material={columnMaterial}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[
        isSideWall ? GATE_PROFILE_W : GATE_PROFILE_H,
        height,
        isSideWall ? GATE_PROFILE_H : GATE_PROFILE_W,
      ]} />
    </mesh>
  );
}

interface LintelAssemblyProps {
  x: number;
  z: number;
  lintelBottomY: number;
  lintelLength: number;
  postInnerHeight: number;
  isSideWall: boolean;
}

function LintelAssembly({
  x,
  z,
  lintelBottomY,
  lintelLength,
  postInnerHeight,
  isSideWall,
}: LintelAssemblyProps) {
  // Bottom beam center Y = lintelBottomY + GATE_PROFILE_H/2
  const bottomBeamY = lintelBottomY + GATE_PROFILE_H / 2;
  // Top beam center Y = lintelBottomY + LINTEL_HEIGHT - GATE_PROFILE_H/2
  const topBeamY = lintelBottomY + LINTEL_HEIGHT - GATE_PROFILE_H / 2;

  // Lintel beams run along the same axis as the wall
  // For side wall: along X, for end wall: along Z
  const beamArgs: [number, number, number] = isSideWall
    ? [lintelLength, GATE_PROFILE_H, GATE_PROFILE_W]
    : [GATE_PROFILE_W, GATE_PROFILE_H, lintelLength];

  // Posts between the two beams
  // 4 posts evenly distributed along the lintel length
  const posts = useMemo(() => {
    const posArr: number[] = [];
    for (let i = 0; i < LINTEL_POSTS; i++) {
      // Evenly spaced along lintel (between inner edges of gate columns)
      const t = (i + 1) / (LINTEL_POSTS + 1);
      posArr.push(-lintelLength / 2 + t * lintelLength);
    }
    return posArr;
  }, [lintelLength]);

  const postCenterY = lintelBottomY + LINTEL_HEIGHT / 2;

  return (
    <group>
      {/* Bottom lintel beam */}
      <mesh
        position={[x, bottomBeamY, z]}
        material={columnMaterial}
        castShadow
        receiveShadow
      >
        <boxGeometry args={beamArgs} />
      </mesh>
      {/* Top lintel beam */}
      <mesh
        position={[x, topBeamY, z]}
        material={columnMaterial}
        castShadow
        receiveShadow
      >
        <boxGeometry args={beamArgs} />
      </mesh>
      {/* Vertical posts */}
      {posts.map((offset, i) => {
        const postArgs: [number, number, number] = [
          GATE_PROFILE_W,
          postInnerHeight,
          GATE_PROFILE_H,
        ];
        const px = isSideWall ? x + offset : x;
        const pz = isSideWall ? z : z + offset;
        return (
          <mesh
            key={i}
            position={[px, postCenterY, pz]}
            material={columnMaterial}
            castShadow
            receiveShadow
          >
            <boxGeometry args={postArgs} />
          </mesh>
        );
      })}
    </group>
  );
}

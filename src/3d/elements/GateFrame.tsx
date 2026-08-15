import React, { useMemo } from 'react';
import { columnMaterial } from '../materials';
import type { HallParameters, Opening, SteelProfile } from '../../types';

// Gate frame profile: RHS 100x100x4 in meters (used for side wall gates)
const GATE_PROFILE_W = 0.100;
const GATE_PROFILE_H = 0.100;
// Lintel: 2 horizontal beams at 450mm outside-to-outside spacing
export const LINTEL_HEIGHT = 0.450;
// Number of vertical posts in lintel
const LINTEL_POSTS = 4;

interface GateFrameProps {
  openings: Opening[];
  params: HallParameters;
  wallHeight: number;
  ridgeHeight: number;
  endColumnProfile?: SteelProfile;
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
  wallHeight,
  ridgeHeight,
  endColumnProfile,
}: GateFrameProps) {
  const { span, length: hallLength } = params;

  // End wall gate column dimensions from endColumnProfile (if provided)
  const endColW = endColumnProfile ? endColumnProfile.b / 1000 : GATE_PROFILE_W;
  const endColH = endColumnProfile ? endColumnProfile.h / 1000 : GATE_PROFILE_H;

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
          wallHeight={wallHeight}
          ridgeHeight={ridgeHeight}
          endColW={endColW}
          endColH={endColH}
        />
      ))}
    </group>
  );
});

interface SingleGateFrameProps {
  opening: Opening;
  span: number;
  hallLength: number;
  wallHeight: number;
  ridgeHeight: number;
  endColW: number;
  endColH: number;
}

function SingleGateFrame({ opening, span, hallLength, wallHeight, ridgeHeight, endColW, endColH }: SingleGateFrameProps) {
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

  // Determine orientation: side walls run along X, end walls run along Z
  const isSideWall = wall === 'side_left' || wall === 'side_right';

  // Per-column heights:
  // Side wall: column reaches from floor to eave (wallHeight)
  // End wall: column reaches from floor to the underside of the rafter at that Z position
  const leftColumnHeight = useMemo(() => {
    if (isSideWall) return wallHeight;
    const colZ = position.z + (-position.halfW);
    const distFromEdge = Math.min(colZ, span - colZ);
    return wallHeight + (ridgeHeight - wallHeight) * (distFromEdge / (span / 2));
  }, [isSideWall, wallHeight, ridgeHeight, span, position.z, position.halfW]);

  const rightColumnHeight = useMemo(() => {
    if (isSideWall) return wallHeight;
    const colZ = position.z + position.halfW;
    const distFromEdge = Math.min(colZ, span - colZ);
    return wallHeight + (ridgeHeight - wallHeight) * (distFromEdge / (span / 2));
  }, [isSideWall, wallHeight, ridgeHeight, span, position.z, position.halfW]);

  // Lintel bottom Y = gate height (lintel is always at gate opening height)
  const lintelBottomY = gateHeight;

  // For side walls, check that the gate fits in the bay
  // For positioning: gate columns at +/- gateWidth/2 from center
  const leftColOffset = -position.halfW;
  const rightColOffset = position.halfW;

  // Lintel beam length = distance between outer edges of columns
  const lintelLength = gateWidth;

  // Column profile dimensions: use endColumnProfile for end walls, RHS 100x100 for side walls
  const colW = isSideWall ? GATE_PROFILE_W : endColW;
  const colH = isSideWall ? GATE_PROFILE_H : endColH;

  // Post height = distance between inner faces of lintel beams = 450 - 2*profileH
  const postInnerHeight = LINTEL_HEIGHT - 2 * colH;

  return (
    <group>
      {/* Left gate column */}
      <GateColumn
        x={position.x + (isSideWall ? leftColOffset : 0)}
        y={0}
        z={position.z + (isSideWall ? 0 : leftColOffset)}
        height={leftColumnHeight}
        isSideWall={isSideWall}
        profileW={colW}
        profileH={colH}
      />
      {/* Right gate column */}
      <GateColumn
        x={position.x + (isSideWall ? rightColOffset : 0)}
        y={0}
        z={position.z + (isSideWall ? 0 : rightColOffset)}
        height={rightColumnHeight}
        isSideWall={isSideWall}
        profileW={colW}
        profileH={colH}
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
  profileW: number;
  profileH: number;
}

function GateColumn({ x, y, z, height, isSideWall, profileW, profileH }: GateColumnProps) {
  // Column rendered as a box (RHS profile)
  // Oriented vertically (Y axis)
  // For side wall: profile is flat on X-Z plane (W along X, H along Z)
  // For end wall: same but rotated (H along X, W along Z)
  return (
    <mesh
      position={[x, y + height / 2, z]}
      material={columnMaterial}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[
        isSideWall ? profileW : profileH,
        height,
        isSideWall ? profileH : profileW,
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

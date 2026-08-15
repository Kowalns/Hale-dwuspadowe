import React, { useMemo } from 'react';
import { useRHSGeometry } from '../profiles/RHSGeometry';
import { columnMaterial } from '../materials';
import type { SteelProfile, Opening } from '../../types';

interface DynamicColumnEntry {
  z: number;
  startY: number;
  colHeight: number;
}

/**
 * Pure function extracted outside the component so that useMemo dependency lists
 * are explicit and no eslint-disable is needed for react-hooks/exhaustive-deps.
 *
 * Generates dynamic column placements for an end wall with gates.
 * Gate jamb columns are NOT generated here because GateFrame already renders them.
 * This function only produces:
 * - Filler columns between gate jambs and corners/other jambs
 * - Above-lintel columns at gate centers
 */
function generateDynamicColumns(
  wallGates: Opening[],
  wallName: 'end_front' | 'end_back',
  span: number,
  wallHeight: number,
  ridgeHeight: number,
): DynamicColumnEntry[] {
  // Compute height at a given Z position following roof slope
  const getHeightAtZ = (z: number): number => {
    const distFromEdge = Math.min(z, span - z);
    return wallHeight + (ridgeHeight - wallHeight) * (distFromEdge / (span / 2));
  };

  // Collect gate jamb positions in world Z
  const jambPositions: Array<{ z: number; gateHeight: number; gateCenter: number }> = [];

  for (const gate of wallGates) {
    let centerZ: number;
    if (wallName === 'end_front') {
      centerZ = span - gate.positionX;
    } else {
      centerZ = gate.positionX;
    }
    const leftJamb = centerZ - gate.width / 2;
    const rightJamb = centerZ + gate.width / 2;
    jambPositions.push({ z: leftJamb, gateHeight: gate.height, gateCenter: centerZ });
    jambPositions.push({ z: rightJamb, gateHeight: gate.height, gateCenter: centerZ });
  }

  // Collect all fixed Z positions (gate jambs), excluding corners at 0 and span
  const fixedZs = jambPositions.map((j) => j.z).filter((z) => z > 0.01 && z < span - 0.01);
  // Sort and deduplicate
  const sortedFixedZs = [...new Set(fixedZs)].sort((a, b) => a - b);

  // All boundary points including corners
  const allBoundaries = [0, ...sortedFixedZs, span];

  const columns: DynamicColumnEntry[] = [];

  // Gate jamb columns are NOT rendered here - GateFrame already renders them.
  // We only use jamb positions as boundary points for filler column placement.

  // Add filler columns between adjacent boundaries
  for (let i = 0; i < allBoundaries.length - 1; i++) {
    const leftZ = allBoundaries[i];
    const rightZ = allBoundaries[i + 1];
    const gap = rightZ - leftZ;

    // Check if this gap contains a gate (i.e., both boundaries are jambs of same gate)
    const isGateSpan = wallGates.some((gate) => {
      let centerZ: number;
      if (wallName === 'end_front') {
        centerZ = span - gate.positionX;
      } else {
        centerZ = gate.positionX;
      }
      const lj = centerZ - gate.width / 2;
      const rj = centerZ + gate.width / 2;
      return Math.abs(leftZ - lj) < 0.01 && Math.abs(rightZ - rj) < 0.01;
    });

    if (isGateSpan) {
      // No filler columns inside the gate span
      continue;
    }

    // Add filler columns: 1 at midpoint if gap <= 3m, else 2 evenly spaced
    if (gap > 0.5) { // only add if meaningful gap
      if (gap > 3.0) {
        // 2 columns at 1/3 and 2/3
        const z1 = leftZ + gap / 3;
        const z2 = leftZ + (2 * gap) / 3;
        columns.push({ z: z1, startY: 0, colHeight: getHeightAtZ(z1) });
        columns.push({ z: z2, startY: 0, colHeight: getHeightAtZ(z2) });
      } else {
        // 1 column at midpoint
        const zMid = leftZ + gap / 2;
        columns.push({ z: zMid, startY: 0, colHeight: getHeightAtZ(zMid) });
      }
    }
  }

  // Add column above lintel at gate center (from lintel top to roof height)
  for (const gate of wallGates) {
    let centerZ: number;
    if (wallName === 'end_front') {
      centerZ = span - gate.positionX;
    } else {
      centerZ = gate.positionX;
    }
    const lintelTop = gate.height + 0.450; // LINTEL_HEIGHT
    const roofHeightAtCenter = getHeightAtZ(centerZ);
    const aboveLintelHeight = roofHeightAtCenter - lintelTop;
    if (aboveLintelHeight > 0.05) {
      columns.push({
        z: centerZ,
        startY: lintelTop,
        colHeight: aboveLintelHeight,
      });
    }
  }

  return columns;
}

interface EndColumnsProps {
  profile: SteelProfile;
  wallHeight: number;
  span: number;
  length: number;
  ridgeHeight: number;
  openings?: Opening[];
}

/**
 * Renders RHS/SHS end columns on both gable ends (X=0 and X=length).
 * 
 * When gates are present on an end wall, columns are placed dynamically:
 * - Filler columns between gate jambs and corners (1 if distance <= 3m, else 2)
 * - 1 column above lintel at gate center (from lintel top to roof slope)
 * 
 * Gate jamb columns are NOT rendered here since GateFrame handles them,
 * avoiding duplicate meshes at the same positions.
 * 
 * When no gates exist on a wall, uniform spacing is used (original behavior).
 */
export const EndColumns = React.memo(function EndColumns({
  profile,
  wallHeight,
  span,
  length: hallLength,
  ridgeHeight,
  openings,
}: EndColumnsProps) {
  // Convert mm to meters
  const width = profile.b / 1000;
  const height = profile.h / 1000;
  const thickness = (profile.t ?? 4) / 1000;

  // Separate gates by wall
  const frontGates = useMemo(
    () => (openings ?? []).filter(
      (o) => o.wall === 'end_front' && (o.type === 'sectional_gate' || o.type === 'sliding_gate')
    ),
    [openings]
  );
  const backGates = useMemo(
    () => (openings ?? []).filter(
      (o) => o.wall === 'end_back' && (o.type === 'sectional_gate' || o.type === 'sliding_gate')
    ),
    [openings]
  );

  // Calculate uniform intermediate column positions (fallback when no gates)
  const uniformPositions = useMemo(() => {
    const targetSpacing = 3.0;
    const n = Math.max(1, Math.round(span / targetSpacing) - 1);
    const positions: Array<{ z: number; colHeight: number }> = [];

    for (let i = 1; i <= n; i++) {
      const z = (i / (n + 1)) * span;
      const distFromEdge = Math.min(z, span - z);
      const colHeight = wallHeight + (ridgeHeight - wallHeight) * (distFromEdge / (span / 2));
      positions.push({ z, colHeight });
    }
    return positions;
  }, [span, wallHeight, ridgeHeight]);

  // Compute columns for front wall
  const frontColumns = useMemo(() => {
    if (frontGates.length === 0) return null;
    return generateDynamicColumns(frontGates, 'end_front', span, wallHeight, ridgeHeight);
  }, [frontGates, span, wallHeight, ridgeHeight]);

  // Compute columns for back wall
  const backColumns = useMemo(() => {
    if (backGates.length === 0) return null;
    return generateDynamicColumns(backGates, 'end_back', span, wallHeight, ridgeHeight);
  }, [backGates, span, wallHeight, ridgeHeight]);

  /**
   * Check if a column at a given Z position on a given wall is overlapped by an opening.
   * Returns the Y offset (top of the opening) if overlapped, or 0 if not.
   * Used for uniform layout only (non-gate openings like doors/windows).
   */
  const getColumnStartY = (wallName: 'end_front' | 'end_back', zPos: number): number => {
    if (!openings) return 0;
    for (const opening of openings) {
      if (opening.wall !== wallName) continue;
      let openingWorldZ: number;
      if (wallName === 'end_front') {
        openingWorldZ = span - opening.positionX;
      } else {
        openingWorldZ = opening.positionX;
      }
      const halfW = opening.width / 2;
      if (zPos >= openingWorldZ - halfW && zPos <= openingWorldZ + halfW) {
        return opening.positionY + opening.height / 2;
      }
    }
    return 0;
  };

  return (
    <group name="end-columns">
      {/* Gable end at X=0 (front) */}
      {frontColumns
        ? frontColumns.map((col, i) => (
            <EndColumn
              key={`front-dyn-${i}`}
              x={0}
              z={col.z}
              startY={col.startY}
              colHeight={col.colHeight}
              width={width}
              height={height}
              thickness={thickness}
            />
          ))
        : uniformPositions.map((pos, i) => {
            const startY = getColumnStartY('end_front', pos.z);
            const adjustedHeight = pos.colHeight - startY;
            if (adjustedHeight <= 0) return null;
            return (
              <EndColumn
                key={`front-${i}`}
                x={0}
                z={pos.z}
                startY={startY}
                colHeight={adjustedHeight}
                width={width}
                height={height}
                thickness={thickness}
              />
            );
          })}
      {/* Gable end at X=length (back) */}
      {backColumns
        ? backColumns.map((col, i) => (
            <EndColumn
              key={`back-dyn-${i}`}
              x={hallLength}
              z={col.z}
              startY={col.startY}
              colHeight={col.colHeight}
              width={width}
              height={height}
              thickness={thickness}
            />
          ))
        : uniformPositions.map((pos, i) => {
            const startY = getColumnStartY('end_back', pos.z);
            const adjustedHeight = pos.colHeight - startY;
            if (adjustedHeight <= 0) return null;
            return (
              <EndColumn
                key={`back-${i}`}
                x={hallLength}
                z={pos.z}
                startY={startY}
                colHeight={adjustedHeight}
                width={width}
                height={height}
                thickness={thickness}
              />
            );
          })}
    </group>
  );
});

interface EndColumnProps {
  x: number;
  z: number;
  startY: number;
  colHeight: number;
  width: number;
  height: number;
  thickness: number;
}

function EndColumn({ x, z, startY, colHeight, width, height, thickness }: EndColumnProps) {
  const geometry = useRHSGeometry({ width, height, thickness, length: colHeight });
  return (
    <mesh
      geometry={geometry}
      material={columnMaterial}
      position={[x, startY, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      castShadow
      receiveShadow
    />
  );
}

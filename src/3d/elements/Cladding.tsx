import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { getRALHex } from '../../data/colors';
import { checkCollision, fitsInWall } from './Openings';
import type { HallParameters, CladdingParameters, Opening, OpeningType, WallIdentifier } from '../../types';

interface CladdingProps {
  params: HallParameters;
  cladding: CladdingParameters;
  showCladding: boolean;
  columnOuterFlangeOffset: number;
  endColumnOuterOffset: number;
  columnSpacing: number;
  numberOfFrames: number;
  placementMode?: boolean;
  openings?: Opening[];
  onPlaceOpening?: (opening: Opening) => void;
  selectedOpeningType?: OpeningType;
  openingWidth?: number;
  openingHeight?: number;
  sillHeight?: number;
}

/**
 * Creates a fully opaque material for a given RAL color code.
 */
function makeCladdingMaterial(ralCode: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: getRALHex(ralCode),
    opacity: 1.0,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
}

/**
 * Trapezoidal profile height function.
 * Profile: flat valley at bottom -> slope up -> flat plateau at top -> slope down -> next valley.
 */
function trapezoidHeight(x: number, period: number, plateauWidth: number, valleyWidth: number, height: number): number {
  const p = ((x % period) + period) % period;
  const slopeWidth = (period - plateauWidth - valleyWidth) / 2;

  if (p < valleyWidth / 2) return 0;
  if (p < valleyWidth / 2 + slopeWidth) {
    const t = (p - valleyWidth / 2) / slopeWidth;
    return t * height;
  }
  if (p < valleyWidth / 2 + slopeWidth + plateauWidth) return height;
  if (p < valleyWidth / 2 + slopeWidth + plateauWidth + slopeWidth) {
    const t = (p - valleyWidth / 2 - slopeWidth - plateauWidth) / slopeWidth;
    return (1 - t) * height;
  }
  return 0;
}

/**
 * Profile parameters for trapezoidal sheets (in meters).
 * T18: height 18mm, plateau 70mm, valley 188mm, period ~290mm
 * T35: height 35mm, plateau 126mm, valley 210mm, period ~381mm
 */
function getTrapezoidalParams(type: 'T18' | 'T35') {
  if (type === 'T35') {
    return { height: 0.035, plateau: 0.126, valley: 0.210, period: 0.381 };
  }
  // T18
  return { height: 0.018, plateau: 0.033, valley: 0.188, period: 0.290 };
}

/**
 * Creates a pentagon (5-point) geometry covering the full end wall from floor to ridge.
 * Uses ShapeGeometry with trapezoidal displacement for profiled sheets,
 * or ExtrudeGeometry with thickness for sandwich panels.
 */
function createPentagonGeometry(
  width: number,
  wallHeight: number,
  ridgeHeight: number,
  profileType: 'T18' | 'T35' | null,
  waveAxis: 'x' | 'y',
  invert: boolean,
  thickness: number
): THREE.BufferGeometry {
  if (profileType) {
    // Trapezoidal: ShapeGeometry with displacement
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, wallHeight - 0.05);
    shape.lineTo(0, ridgeHeight - 0.05);
    shape.lineTo(-width / 2, wallHeight - 0.05);
    shape.closePath();

    // Need enough segments for displacement
    const { height: amp, plateau, valley, period } = getTrapezoidalParams(profileType);
    const extent = waveAxis === 'x' ? width : ridgeHeight;
    const waveCount = Math.ceil(extent / period);
    const segments = Math.min(waveCount * 10, 500);

    const geo = new THREE.ShapeGeometry(shape, segments);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const coord = waveAxis === 'x' ? pos.getX(i) : pos.getY(i);
      const displacement = trapezoidHeight(coord + extent / 2, period, plateau, valley, amp);
      pos.setZ(i, invert ? -displacement : displacement);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  } else {
    // Sandwich: ExtrudeGeometry with thickness
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, wallHeight - 0.05);
    shape.lineTo(0, ridgeHeight - 0.05);
    shape.lineTo(-width / 2, wallHeight - 0.05);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false,
    });
    geo.translate(0, 0, -thickness / 2);
    geo.computeVertexNormals();
    return geo;
  }
}

/**
 * Creates a PlaneGeometry with trapezoidal vertex displacement.
 * Waves run along the waveAxis ('x' for walls = vertical ribs, 'y' for roof along slope).
 * Displacement is applied along the Z normal of the plane.
 */
function createTrapezoidalGeometry(
  width: number,
  height: number,
  profileType: 'T18' | 'T35',
  waveAxis: 'x' | 'y',
  invert: boolean = false,
): THREE.PlaneGeometry {
  const { height: amp, plateau, valley, period } = getTrapezoidalParams(profileType);

  // Scale segments: 10 vertices per wave period along wave axis for proper trapezoid rendering
  const waveCount = waveAxis === 'x' ? Math.ceil(width / period) : Math.ceil(height / period);
  const segAlongWave = Math.min(waveCount * 10, 1000); // 10 segments per wave period minimum
  const segCross = Math.min(Math.ceil((waveAxis === 'x' ? height : width) * 2), 100);
  const segW = waveAxis === 'x' ? segAlongWave : segCross;
  const segH = waveAxis === 'x' ? segCross : segAlongWave;

  const geo = new THREE.PlaneGeometry(width, height, segW, segH);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Determine the coordinate along which the wave varies
    const coord = waveAxis === 'x' ? x : y;
    const displacement = trapezoidHeight(coord + (waveAxis === 'x' ? width : height) / 2, period, plateau, valley, amp);
    pos.setZ(i, invert ? -displacement : displacement);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

interface ColorSegment { startLayer: number; endLayer: number; color: string; }

/**
 * Cladding component rendering walls and roof panels with RAL colors.
 * Trapezoidal profiles use proper trapezoidal waveform (not sinusoidal).
 * Sandwich panels use BoxGeometry with 100mm thickness.
 * Roof panels have ribs running along slope (waveAxis = 'x' on the plane, which corresponds to building length axis).
 */
export const Cladding = React.memo(function Cladding({
  params,
  cladding,
  showCladding,
  columnOuterFlangeOffset,
  endColumnOuterOffset,
  columnSpacing,
  numberOfFrames,
  placementMode,
  openings,
  onPlaceOpening,
  selectedOpeningType,
  openingWidth,
  openingHeight,
  sillHeight,
}: CladdingProps) {
  const { span, length: hallLength, wallHeight, roofAngle } = params;

  const roofAngleRad = (roofAngle * Math.PI) / 180;
  const ridgeHeight = wallHeight + (span / 2) * Math.tan(roofAngleRad);
  const gableTriangleHeight = ridgeHeight - wallHeight;
  const roofSlopeLength = (span / 2) / Math.cos(roofAngleRad);

  // Eave overhang in meters
  const eaveOverhangM = (cladding.eaveOverhang ?? 300) / 1000;

  // Determine if walls are trapezoidal or sandwich
  const isSideWallTrapezoid = cladding.sideWallType === 'trapezoid';
  const isEndWallTrapezoid = cladding.endWallType === 'trapezoid';

  // Determine trapezoidal parameters for roof
  const isRoofTrapezoid = cladding.roofType === 'T18' || cladding.roofType === 'T35';

  // Wall thickness offset: shift walls outward by their thickness to avoid column collision
  const sideWallThicknessOffset = isSideWallTrapezoid
    ? getTrapezoidalParams((cladding.sideWallType as string) === 'T35' ? 'T35' : 'T18').height
    : (cladding.sandwichThickness ?? 100) / 1000 / 2;
  const endWallThicknessOffset = isEndWallTrapezoid
    ? getTrapezoidalParams((cladding.endWallType as string) === 'T35' ? 'T35' : 'T18').height
    : (cladding.sandwichThickness ?? 100) / 1000 / 2;

  // Wall geometries
  // panelOrientation determines the direction of ribs:
  // 'horizontal' -> ribs run horizontally -> wave repeats along Y -> waveAxis = 'y'
  // 'vertical' -> ribs run vertically -> wave repeats along X -> waveAxis = 'x'
  const wallWaveAxis = cladding.panelOrientation === 'horizontal' ? 'y' : 'x';

  const sideWallHeight = wallHeight - 0.05;

  const sandwichThicknessM = (cladding.sandwichThickness ?? 100) / 1000;
  const sideWallProfileType: 'T18' | 'T35' = 'T18';
  const numberOfBays = numberOfFrames - 1;

  const endWallWidth = span + 2 * (columnOuterFlangeOffset + 2 * sideWallThicknessOffset);

  const endWallFullGeometry = useMemo(() => {
    const profileType: 'T18' | 'T35' | null = isEndWallTrapezoid ? 'T18' : null;
    return createPentagonGeometry(endWallWidth, wallHeight, ridgeHeight, profileType, wallWaveAxis, true, sandwichThicknessM);
  }, [endWallWidth, wallHeight, ridgeHeight, isEndWallTrapezoid, wallWaveAxis, sandwichThicknessM]);

  // Roof geometry: ribs run along the slope (from ridge to eave).
  // The plane is hallLength x roofSlopeLengthWithOverhang.
  // On the plane, X = along building length, Y = along slope.
  // Ribs along slope means wave varies along X (perpendicular to slope direction),
  // so each rib stripe runs along Y (the slope direction).
  // Actually: "garby wzdluz spadku" means ridges go from ridge to eave = along Y on the plane.
  // That means the wave pattern repeats along X. So waveAxis = 'x'.
  const roofWidth = hallLength + 2 * (endColumnOuterOffset + 2 * endWallThicknessOffset);
  const roofSlopeLengthWithOverhang = roofSlopeLength + eaveOverhangM;
  const roofGeometry = useMemo(() => {
    if (isRoofTrapezoid) {
      const profileType = cladding.roofType === 'T35' ? 'T35' : 'T18';
      // Ribs run along slope (Y direction), wave repeats along X (building length direction)
      return createTrapezoidalGeometry(roofWidth, roofSlopeLengthWithOverhang, profileType, 'x');
    }
    // Sandwich roof: BoxGeometry with 100mm thickness
    return new THREE.BoxGeometry(roofWidth, roofSlopeLengthWithOverhang, 0.1);
  }, [roofWidth, roofSlopeLengthWithOverhang, isRoofTrapezoid, cladding.roofType]);

  // Dispose geometries
  useEffect(() => {
    return () => { endWallFullGeometry.dispose(); };
  }, [endWallFullGeometry]);
  useEffect(() => {
    return () => { roofGeometry.dispose(); };
  }, [roofGeometry]);

  // Materials
  const sideWallMat = useMemo(() => {
    const mat = makeCladdingMaterial(cladding.sideWallColor);
    if (!isSideWallTrapezoid) {
      mat.roughness = 0.5;
      mat.metalness = 0.1;
    }
    return mat;
  }, [cladding.sideWallColor, isSideWallTrapezoid]);
  const endWallMat = useMemo(() => makeCladdingMaterial(cladding.endWallColor), [cladding.endWallColor]);
  const roofMat = useMemo(() => makeCladdingMaterial(cladding.roofColor), [cladding.roofColor]);

  // Dispose materials on color change or unmount
  useEffect(() => {
    return () => { sideWallMat.dispose(); };
  }, [sideWallMat]);
  useEffect(() => {
    return () => { endWallMat.dispose(); };
  }, [endWallMat]);
  useEffect(() => {
    return () => { roofMat.dispose(); };
  }, [roofMat]);

  // Side wall stripes
  const sideStripes = useMemo(
    () => cladding.colorStripes.filter((s) => s.wallType === 'side'),
    [cladding.colorStripes]
  );


  // Determine which bays have gates and store gate info for cutout rendering
  const sideLeftGatesByBay = useMemo(() => {
    if (!openings) return new Map<number, Opening>();
    const map = new Map<number, Opening>();
    for (const o of openings) {
      if ((o.wall === 'side_left') && (o.type === 'sectional_gate' || o.type === 'sliding_gate')) {
        const bay = Math.floor(o.positionX / columnSpacing);
        map.set(bay, o);
      }
    }
    return map;
  }, [openings, columnSpacing]);

  const sideRightGatesByBay = useMemo(() => {
    if (!openings) return new Map<number, Opening>();
    const map = new Map<number, Opening>();
    for (const o of openings) {
      if ((o.wall === 'side_right') && (o.type === 'sectional_gate' || o.type === 'sliding_gate')) {
        const bay = Math.floor((hallLength - o.positionX) / columnSpacing);
        map.set(bay, o);
      }
    }
    return map;
  }, [openings, columnSpacing, hallLength]);

  /**
   * Handle side wall click for opening placement.
   * Side walls are per-bay panels, so localPoint is relative to the panel, not the full wall.
   * This function simply centers the opening in the clicked bay without coordinate conversion.
   */
  const handleSideWallClick = (wall: WallIdentifier, bayIndex: number, event: ThreeEvent<PointerEvent>) => {
    if (!placementMode || !onPlaceOpening || !selectedOpeningType) return;
    event.stopPropagation();

    const w = openingWidth ?? 1;
    const h = openingHeight ?? 1;

    if (w > columnSpacing) return;

    const bayStart = bayIndex * columnSpacing;
    const bayEnd = (bayIndex + 1) * columnSpacing;
    const posX = (bayStart + bayEnd) / 2;

    let finalPosY: number;
    let finalSillHeight: number;
    if (selectedOpeningType === 'window') {
      finalSillHeight = sillHeight ?? 0.9;
      finalPosY = finalSillHeight + h / 2;
    } else {
      finalSillHeight = 0;
      finalPosY = h / 2;
    }
    finalPosY = Math.round(finalPosY * 10) / 10;

    const newOpening: Opening = {
      id: `opening-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: selectedOpeningType,
      width: w,
      height: h,
      wall,
      positionX: posX,
      positionY: finalPosY,
      sillHeight: finalSillHeight,
    };

    if (!fitsInWall(newOpening, params)) return;
    if (openings) {
      for (const existing of openings) {
        if (checkCollision(newOpening, existing)) return;
      }
    }
    onPlaceOpening(newOpening);
  };

  /**
   * Handle wall click for opening placement.
   * Computes local coordinates, snaps to 100mm grid, validates bounds + collision.
   * On side walls, gates are centered within the clicked bay.
   */
  const handleWallClick = (wall: WallIdentifier, wallWidth: number, event: ThreeEvent<PointerEvent>) => {
    if (!placementMode || !onPlaceOpening || !selectedOpeningType) return;
    event.stopPropagation();

    const w = openingWidth ?? 1;
    const h = openingHeight ?? 1;

    // Get the local point on the plane geometry
    const localPoint = event.point.clone();
    const mesh = event.object as THREE.Mesh;
    mesh.worldToLocal(localPoint);

    // Convert from plane-local to wall-local coordinates
    let posX = localPoint.x + wallWidth / 2;
    let posY = localPoint.y + wallHeight / 2;

    // Snap to 100mm grid
    posX = Math.round(posX * 10) / 10;
    posY = Math.round(posY * 10) / 10;

    // For side walls, center the opening within the clicked bay
    if (wall === 'side_left' || wall === 'side_right') {
      // Reject if gate is wider than bay
      if (w > columnSpacing) return;
      const bayIndex = Math.floor(posX / columnSpacing);
      const bayStart = bayIndex * columnSpacing;
      const bayEnd = bayStart + columnSpacing;
      posX = (bayStart + bayEnd) / 2;
    }

    // For gates and doors, bottom should be at ground level
    // For windows, bottom should be at sill height
    let finalPosY: number;
    let finalSillHeight: number;
    if (selectedOpeningType === 'window') {
      finalSillHeight = sillHeight ?? 0.9;
      finalPosY = finalSillHeight + h / 2;
    } else {
      // Gates and doors sit on the ground
      finalSillHeight = 0;
      finalPosY = h / 2;
    }

    // Snap Y to grid too
    finalPosY = Math.round(finalPosY * 10) / 10;

    const newOpening: Opening = {
      id: `opening-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: selectedOpeningType,
      width: w,
      height: h,
      wall,
      positionX: posX,
      positionY: finalPosY,
      sillHeight: finalSillHeight,
    };

    // Check bounds
    if (!fitsInWall(newOpening, params)) return;

    // Check collision with existing openings
    if (openings) {
      for (const existing of openings) {
        if (checkCollision(newOpening, existing)) return;
      }
    }

    onPlaceOpening(newOpening);
  };

  if (!showCladding) return null;

  return (
    <group name="cladding">
      {/* Side wall panels - left (Z=0 side) */}
      {Array.from({ length: numberOfBays }).map((_, bayIndex) => {
        const bayStart = bayIndex * columnSpacing;
        const bayEnd = (bayIndex + 1) * columnSpacing;
        let panelWidth = columnSpacing - 0.020;
        let panelCenterX = (bayStart + bayEnd) / 2;

        if (bayIndex === 0) {
          const leftEdge = 0.010;
          const rightEdge = columnSpacing - 0.010;
          panelWidth = rightEdge - leftEdge;
          panelCenterX = (leftEdge + rightEdge) / 2;
        } else if (bayIndex === numberOfBays - 1) {
          const leftEdge = (numberOfBays - 1) * columnSpacing + 0.010;
          const rightEdge = hallLength - 0.010;
          panelWidth = rightEdge - leftEdge;
          panelCenterX = (leftEdge + rightEdge) / 2;
        }

        const gate = sideLeftGatesByBay.get(bayIndex);
        if (gate) {
          // Render 3 fragments around the gate cutout
          const panelLeftEdge = panelCenterX - panelWidth / 2;
          const panelRightEdge = panelCenterX + panelWidth / 2;
          const gateLeftEdge = gate.positionX - gate.width / 2;
          const gateRightEdge = gate.positionX + gate.width / 2;
          const gateTop = gate.height; // gate bottom is at ground level (sillHeight=0)

          const fragments: React.ReactNode[] = [];

          // Left fragment
          const leftFragWidth = gateLeftEdge - panelLeftEdge;
          if (leftFragWidth > 0.001) {
            const leftFragCenterX = panelLeftEdge + leftFragWidth / 2;
            fragments.push(
              <mesh
                key={`side-left-${bayIndex}-frag-left`}
                position={[leftFragCenterX, sideWallHeight / 2, -(columnOuterFlangeOffset + sideWallThicknessOffset)]}
                material={sideWallMat}
              >
                {isSideWallTrapezoid
                  ? <primitive object={createTrapezoidalGeometry(leftFragWidth, sideWallHeight, sideWallProfileType, wallWaveAxis, true)} attach="geometry" />
                  : <boxGeometry args={[leftFragWidth, sideWallHeight, sandwichThicknessM]} />
                }
              </mesh>
            );
          }

          // Right fragment
          const rightFragWidth = panelRightEdge - gateRightEdge;
          if (rightFragWidth > 0.001) {
            const rightFragCenterX = gateRightEdge + rightFragWidth / 2;
            fragments.push(
              <mesh
                key={`side-left-${bayIndex}-frag-right`}
                position={[rightFragCenterX, sideWallHeight / 2, -(columnOuterFlangeOffset + sideWallThicknessOffset)]}
                material={sideWallMat}
              >
                {isSideWallTrapezoid
                  ? <primitive object={createTrapezoidalGeometry(rightFragWidth, sideWallHeight, sideWallProfileType, wallWaveAxis, true)} attach="geometry" />
                  : <boxGeometry args={[rightFragWidth, sideWallHeight, sandwichThicknessM]} />
                }
              </mesh>
            );
          }

          // Top fragment (above gate, full gate width)
          const topFragHeight = sideWallHeight - gateTop;
          if (topFragHeight > 0.001) {
            const topFragCenterX = gate.positionX;
            const topFragCenterY = gateTop + topFragHeight / 2;
            fragments.push(
              <mesh
                key={`side-left-${bayIndex}-frag-top`}
                position={[topFragCenterX, topFragCenterY, -(columnOuterFlangeOffset + sideWallThicknessOffset)]}
                material={sideWallMat}
              >
                {isSideWallTrapezoid
                  ? <primitive object={createTrapezoidalGeometry(gate.width, topFragHeight, sideWallProfileType, wallWaveAxis, true)} attach="geometry" />
                  : <boxGeometry args={[gate.width, topFragHeight, sandwichThicknessM]} />
                }
              </mesh>
            );
          }

          return <React.Fragment key={`side-left-${bayIndex}`}>{fragments}</React.Fragment>;
        }

        // Compute color segments for this bay panel
        const panelHeightM = cladding.panelWidth / 1000;
        const numLayers = Math.floor(sideWallHeight / panelHeightM);

        const zPosition = -(columnOuterFlangeOffset + sideWallThicknessOffset);

        // When no color stripes, render a single mesh covering full sideWallHeight
        if (sideStripes.length === 0) {
          return (
            <React.Fragment key={`side-left-${bayIndex}`}>
              <mesh
                key={`side-left-${bayIndex}-full`}
                position={[panelCenterX, sideWallHeight / 2, zPosition]}
                material={sideWallMat}
                onPointerDown={placementMode ? (e) => handleSideWallClick('side_left', bayIndex, e) : undefined}
              >
                {isSideWallTrapezoid
                  ? <primitive object={createTrapezoidalGeometry(panelWidth, sideWallHeight, sideWallProfileType, wallWaveAxis, true)} attach="geometry" />
                  : <boxGeometry args={[panelWidth, sideWallHeight, sandwichThicknessM]} />
                }
              </mesh>
            </React.Fragment>
          );
        }

        const layerColors: string[] = [];
        for (let layer = 1; layer <= numLayers; layer++) {
          const stripe = sideStripes.find(s => layer >= s.layerStart && layer <= s.layerEnd);
          layerColors.push(stripe ? stripe.color : cladding.sideWallColor);
        }

        const segments: ColorSegment[] = [];
        if (numLayers > 0) {
          let currentColor = layerColors[0];
          let segStartLayer = 1;
          for (let i = 1; i < layerColors.length; i++) {
            if (layerColors[i] !== currentColor) {
              segments.push({ startLayer: segStartLayer, endLayer: i, color: currentColor });
              currentColor = layerColors[i];
              segStartLayer = i + 1;
            }
          }
          segments.push({ startLayer: segStartLayer, endLayer: numLayers, color: currentColor });
        }

        // Ensure segments cover the full sideWallHeight: if numLayers * panelHeightM < sideWallHeight,
        // extend the last segment to reach sideWallHeight
        const coveredHeight = numLayers * panelHeightM;
        const remainder = sideWallHeight - coveredHeight;

        return (
          <React.Fragment key={`side-left-${bayIndex}`}>
            {segments.map((seg, segIdx) => {
              let segHeight = (seg.endLayer - seg.startLayer + 1) * panelHeightM;
              const segBottomY = (seg.startLayer - 1) * panelHeightM;
              // Add remainder to the last segment so it reaches sideWallHeight
              if (segIdx === segments.length - 1 && remainder > 0.0001) {
                segHeight += remainder;
              }
              const segCenterY = segBottomY + segHeight / 2;
              const segMat = seg.color === cladding.sideWallColor ? sideWallMat : makeCladdingMaterial(seg.color);

              return (
                <mesh
                  key={`side-left-${bayIndex}-seg-${segIdx}`}
                  position={[panelCenterX, segCenterY, zPosition]}
                  material={segMat}
                  onPointerDown={placementMode ? (e) => handleSideWallClick('side_left', bayIndex, e) : undefined}
                >
                  {isSideWallTrapezoid
                    ? <primitive object={createTrapezoidalGeometry(panelWidth, segHeight, sideWallProfileType, wallWaveAxis, true)} attach="geometry" />
                    : <boxGeometry args={[panelWidth, segHeight, sandwichThicknessM]} />
                  }
                </mesh>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* Side wall panels - right (Z=span side) */}
      {Array.from({ length: numberOfBays }).map((_, bayIndex) => {
        const bayStart = bayIndex * columnSpacing;
        const bayEnd = (bayIndex + 1) * columnSpacing;
        let panelWidth = columnSpacing - 0.020;
        let panelCenterX = (bayStart + bayEnd) / 2;

        if (bayIndex === 0) {
          const leftEdge = 0.010;
          const rightEdge = columnSpacing - 0.010;
          panelWidth = rightEdge - leftEdge;
          panelCenterX = (leftEdge + rightEdge) / 2;
        } else if (bayIndex === numberOfBays - 1) {
          const leftEdge = (numberOfBays - 1) * columnSpacing + 0.010;
          const rightEdge = hallLength - 0.010;
          panelWidth = rightEdge - leftEdge;
          panelCenterX = (leftEdge + rightEdge) / 2;
        }

        const gate = sideRightGatesByBay.get(bayIndex);
        if (gate) {
          // For the right wall, gate.positionX is measured from the wall's perspective
          // The bay index is computed as Math.floor((hallLength - gate.positionX) / columnSpacing)
          // So the gate's X position in world space is gate.positionX (from X=0)
          // But the right wall panels are positioned using the same bayStart/bayEnd as left wall
          // The gate world X is: hallLength - gate.positionX (mirrored)
          // Actually: positionX for side_right is from left edge of that wall's local space
          // In the bay calculation above: bay = Math.floor((hallLength - o.positionX) / columnSpacing)
          // This means the panel world X is bayStart..bayEnd, and gate world X is hallLength - o.positionX
          // Let's use the gate's actual position in the same coordinate system as panels:
          const gateWorldX = hallLength - gate.positionX;
          const panelLeftEdge = panelCenterX - panelWidth / 2;
          const panelRightEdge = panelCenterX + panelWidth / 2;
          const gateLeftEdge = gateWorldX - gate.width / 2;
          const gateRightEdge = gateWorldX + gate.width / 2;
          const gateTop = gate.height;

          const fragments: React.ReactNode[] = [];

          // Left fragment
          const leftFragWidth = gateLeftEdge - panelLeftEdge;
          if (leftFragWidth > 0.001) {
            const leftFragCenterX = panelLeftEdge + leftFragWidth / 2;
            fragments.push(
              <mesh
                key={`side-right-${bayIndex}-frag-left`}
                position={[leftFragCenterX, sideWallHeight / 2, span + columnOuterFlangeOffset + sideWallThicknessOffset]}
                rotation={[0, Math.PI, 0]}
                material={sideWallMat}
              >
                {isSideWallTrapezoid
                  ? <primitive object={createTrapezoidalGeometry(leftFragWidth, sideWallHeight, sideWallProfileType, wallWaveAxis, true)} attach="geometry" />
                  : <boxGeometry args={[leftFragWidth, sideWallHeight, sandwichThicknessM]} />
                }
              </mesh>
            );
          }

          // Right fragment
          const rightFragWidth = panelRightEdge - gateRightEdge;
          if (rightFragWidth > 0.001) {
            const rightFragCenterX = gateRightEdge + rightFragWidth / 2;
            fragments.push(
              <mesh
                key={`side-right-${bayIndex}-frag-right`}
                position={[rightFragCenterX, sideWallHeight / 2, span + columnOuterFlangeOffset + sideWallThicknessOffset]}
                rotation={[0, Math.PI, 0]}
                material={sideWallMat}
              >
                {isSideWallTrapezoid
                  ? <primitive object={createTrapezoidalGeometry(rightFragWidth, sideWallHeight, sideWallProfileType, wallWaveAxis, true)} attach="geometry" />
                  : <boxGeometry args={[rightFragWidth, sideWallHeight, sandwichThicknessM]} />
                }
              </mesh>
            );
          }

          // Top fragment (above gate, full gate width)
          const topFragHeight = sideWallHeight - gateTop;
          if (topFragHeight > 0.001) {
            const topFragCenterX = gateWorldX;
            const topFragCenterY = gateTop + topFragHeight / 2;
            fragments.push(
              <mesh
                key={`side-right-${bayIndex}-frag-top`}
                position={[topFragCenterX, topFragCenterY, span + columnOuterFlangeOffset + sideWallThicknessOffset]}
                rotation={[0, Math.PI, 0]}
                material={sideWallMat}
              >
                {isSideWallTrapezoid
                  ? <primitive object={createTrapezoidalGeometry(gate.width, topFragHeight, sideWallProfileType, wallWaveAxis, true)} attach="geometry" />
                  : <boxGeometry args={[gate.width, topFragHeight, sandwichThicknessM]} />
                }
              </mesh>
            );
          }

          return <React.Fragment key={`side-right-${bayIndex}`}>{fragments}</React.Fragment>;
        }

        // Compute color segments for this bay panel
        const panelHeightM = cladding.panelWidth / 1000;
        const numLayers = Math.floor(sideWallHeight / panelHeightM);

        const zPosition = span + columnOuterFlangeOffset + sideWallThicknessOffset;

        // When no color stripes, render a single mesh covering full sideWallHeight
        if (sideStripes.length === 0) {
          return (
            <React.Fragment key={`side-right-${bayIndex}`}>
              <mesh
                key={`side-right-${bayIndex}-full`}
                position={[panelCenterX, sideWallHeight / 2, zPosition]}
                rotation={[0, Math.PI, 0]}
                material={sideWallMat}
                onPointerDown={placementMode ? (e) => handleSideWallClick('side_right', bayIndex, e) : undefined}
              >
                {isSideWallTrapezoid
                  ? <primitive object={createTrapezoidalGeometry(panelWidth, sideWallHeight, sideWallProfileType, wallWaveAxis, true)} attach="geometry" />
                  : <boxGeometry args={[panelWidth, sideWallHeight, sandwichThicknessM]} />
                }
              </mesh>
            </React.Fragment>
          );
        }

        const layerColors: string[] = [];
        for (let layer = 1; layer <= numLayers; layer++) {
          const stripe = sideStripes.find(s => layer >= s.layerStart && layer <= s.layerEnd);
          layerColors.push(stripe ? stripe.color : cladding.sideWallColor);
        }

        const segments: ColorSegment[] = [];
        if (numLayers > 0) {
          let currentColor = layerColors[0];
          let segStartLayer = 1;
          for (let i = 1; i < layerColors.length; i++) {
            if (layerColors[i] !== currentColor) {
              segments.push({ startLayer: segStartLayer, endLayer: i, color: currentColor });
              currentColor = layerColors[i];
              segStartLayer = i + 1;
            }
          }
          segments.push({ startLayer: segStartLayer, endLayer: numLayers, color: currentColor });
        }

        // Ensure segments cover the full sideWallHeight: if numLayers * panelHeightM < sideWallHeight,
        // extend the last segment to reach sideWallHeight
        const coveredHeight = numLayers * panelHeightM;
        const remainder = sideWallHeight - coveredHeight;

        return (
          <React.Fragment key={`side-right-${bayIndex}`}>
            {segments.map((seg, segIdx) => {
              let segHeight = (seg.endLayer - seg.startLayer + 1) * panelHeightM;
              const segBottomY = (seg.startLayer - 1) * panelHeightM;
              // Add remainder to the last segment so it reaches sideWallHeight
              if (segIdx === segments.length - 1 && remainder > 0.0001) {
                segHeight += remainder;
              }
              const segCenterY = segBottomY + segHeight / 2;
              const segMat = seg.color === cladding.sideWallColor ? sideWallMat : makeCladdingMaterial(seg.color);

              return (
                <mesh
                  key={`side-right-${bayIndex}-seg-${segIdx}`}
                  position={[panelCenterX, segCenterY, zPosition]}
                  rotation={[0, Math.PI, 0]}
                  material={segMat}
                  onPointerDown={placementMode ? (e) => handleSideWallClick('side_right', bayIndex, e) : undefined}
                >
                  {isSideWallTrapezoid
                    ? <primitive object={createTrapezoidalGeometry(panelWidth, segHeight, sideWallProfileType, wallWaveAxis, true)} attach="geometry" />
                    : <boxGeometry args={[panelWidth, segHeight, sandwichThicknessM]} />
                  }
                </mesh>
              );
            })}
          </React.Fragment>
        );
      })}



      {/* End wall X=-offset (front gable) - full pentagon */}
      <mesh
        position={[-(endColumnOuterOffset + endWallThicknessOffset), 0, span / 2]}
        rotation={[0, Math.PI / 2, 0]}
        geometry={endWallFullGeometry}
        material={endWallMat}
        onPointerDown={placementMode ? (e) => handleWallClick('end_front', span, e) : undefined}
      />

      {/* End wall X=hallLength+offset (back gable) - full pentagon */}
      <mesh
        position={[hallLength + endColumnOuterOffset + endWallThicknessOffset, 0, span / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        geometry={endWallFullGeometry}
        material={endWallMat}
        onPointerDown={placementMode ? (e) => handleWallClick('end_back', span, e) : undefined}
      />



      {/* Roof - left slope (Z=0 side going up to ridge) */}
      {/* Roof panels extend beyond side walls by eaveOverhang */}
      <mesh
        position={[
          hallLength / 2,
          wallHeight + gableTriangleHeight / 2 + 0.003 - eaveOverhangM * Math.sin(roofAngleRad) / 2,
          span / 4 - eaveOverhangM * Math.cos(roofAngleRad) / 2,
        ]}
        rotation={[Math.PI / 2 - roofAngleRad, 0, 0]}
        geometry={roofGeometry}
        material={roofMat}
      />

      {/* Roof - right slope (Z=span side going up to ridge) */}
      <mesh
        position={[
          hallLength / 2,
          wallHeight + gableTriangleHeight / 2 + 0.003 - eaveOverhangM * Math.sin(roofAngleRad) / 2,
          (3 * span) / 4 + eaveOverhangM * Math.cos(roofAngleRad) / 2,
        ]}
        rotation={[-(Math.PI / 2 - roofAngleRad), 0, 0]}
        geometry={roofGeometry}
        material={roofMat}
      />
    </group>
  );
});


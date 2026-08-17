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
 * Creates a PlaneGeometry with V-groove microlining on the surface.
 * V-groove every 33mm (0.033m), depth 0.5mm (0.0005m).
 * The grooves run horizontally (along the width of the plane).
 */
function createMicrolinedGeometry(
  width: number,
  height: number,
): THREE.PlaneGeometry {
  const grooveSpacing = 0.033; // 33mm
  const grooveDepth = 0.0005; // 0.5mm

  // We need enough vertical segments to represent grooves
  const segY = Math.min(Math.ceil(height / grooveSpacing) * 4, 2000);
  const segX = Math.max(Math.ceil(width * 2), 20);

  const geo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // Position in groove cycle (offset to start from bottom)
    const localY = y + height / 2;
    const phase = ((localY % grooveSpacing) + grooveSpacing) % grooveSpacing;
    const normalized = phase / grooveSpacing;
    // V-groove: sharp dip at the groove line (normalized ~ 0 or ~ 1)
    // Use a triangle wave that creates a V-shape at each groove boundary
    const distFromGroove = Math.abs(normalized - 0.5) * 2; // 0 at center, 1 at edges (groove lines)
    // Invert: deepest at edges (groove lines), flat at center
    const displacement = -grooveDepth * Math.pow(distFromGroove, 4);
    pos.setZ(i, displacement);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
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
 * Creates a BufferGeometry with a dense vertex grid INSIDE a trapezoid shape,
 * with optional trapezoidal profile displacement along Z.
 * This avoids the earcut triangulation issue where ShapeGeometry with 4 vertices
 * only produces 2 triangles, causing deformed edges when displacement is applied.
 */
function createTrapezoidMeshGeometry(
  panelWidth: number,
  hLeft: number,
  hRight: number,
  profileType: 'T18' | 'T35' | null,
  waveAxis: 'x' | 'y',
): THREE.BufferGeometry {
  const segX = 20;
  const maxH = Math.max(hLeft, hRight);
  if (maxH < 0.01) return new THREE.PlaneGeometry(panelWidth, 0.01);

  // For sandwich panels (no profile): use ExtrudeGeometry with thickness
  if (!profileType) {
    const shape = new THREE.Shape();
    shape.moveTo(-panelWidth / 2, 0);
    shape.lineTo(panelWidth / 2, 0);
    shape.lineTo(panelWidth / 2, hRight);
    shape.lineTo(-panelWidth / 2, hLeft);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
    geo.translate(0, 0, -0.05);
    geo.computeVertexNormals();
    return geo;
  }

  const segY = Math.max(10, Math.ceil(maxH * 20));

  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  const cols = segX + 1;
  const rows = segY + 1;

  for (let iy = 0; iy < rows; iy++) {
    const ty = iy / segY;
    for (let ix = 0; ix < cols; ix++) {
      const tx = ix / segX;

      const x = -panelWidth / 2 + tx * panelWidth;
      const maxYatX = hLeft + tx * (hRight - hLeft);
      const y = ty * maxYatX;

      let z = 0;
      if (profileType) {
        const { height: amp, plateau, valley, period } = getTrapezoidalParams(profileType);
        const coord = waveAxis === 'x' ? x : y;
        const extent = waveAxis === 'x' ? panelWidth : maxH;
        z = -trapezoidHeight(coord + extent / 2, period, plateau, valley, amp);
      }

      vertices.push(x, y, z);
      normals.push(0, 0, 1);
    }
  }

  for (let iy = 0; iy < segY; iy++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iy * cols + ix;
      const b = iy * cols + ix + 1;
      const c = (iy + 1) * cols + ix;
      const d = (iy + 1) * cols + ix + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
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

  // Determine trapezoidal parameters for roof (temporarily unused - flat roof for positioning fix)
  const _isRoofTrapezoid = cladding.roofType === 'T18' || cladding.roofType === 'T35';
  void _isRoofTrapezoid;

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

  // Roof geometry: ribs run along the slope (from ridge to eave).
  // The plane is hallLength x roofSlopeLengthWithOverhang.
  // On the plane, X = along building length, Y = along slope.
  // Ribs along slope means wave varies along X (perpendicular to slope direction),
  // so each rib stripe runs along Y (the slope direction).
  // Actually: "garby wzdluz spadku" means ridges go from ridge to eave = along Y on the plane.
  // That means the wave pattern repeats along X. So waveAxis = 'x'.
  const roofWidth = hallLength + 2 * (endColumnOuterOffset + 2 * endWallThicknessOffset);
  const roofSlopeLengthWithOverhang = roofSlopeLength + eaveOverhangM;
  const roofThickness = 0.02; // 20mm flat roof panel for now
  const roofGeometry = useMemo(() => {
    return new THREE.BoxGeometry(roofWidth, roofSlopeLengthWithOverhang, roofThickness);
  }, [roofWidth, roofSlopeLengthWithOverhang]);

  const roofGeometryRight = roofGeometry; // same geometry for both slopes

  // Dispose geometries
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

  // End wall stripes
  const endStripes = useMemo(
    () => cladding.colorStripes.filter((s) => s.wallType === 'end'),
    [cladding.colorStripes]
  );

  // End wall column Z positions (same logic as EndColumns, incorporating gates)
  // Uniform positions (fallback when no gates on a wall)
  const endColZPositionsUniform = useMemo(() => {
    const targetSpacing = 3.0;
    const n = Math.max(1, Math.round(span / targetSpacing) - 1);
    const uniformPositions = [0];
    for (let i = 1; i <= n; i++) uniformPositions.push((i / (n + 1)) * span);
    uniformPositions.push(span);
    uniformPositions.sort((a, b) => a - b);
    return uniformPositions;
  }, [span]);

  // Gates on end walls (for column position computation)
  const endFrontGates = useMemo(() => {
    if (!openings) return [] as Opening[];
    return openings.filter(
      (o) => o.wall === 'end_front' && (o.type === 'sectional_gate' || o.type === 'sliding_gate')
    );
  }, [openings]);

  const endBackGates = useMemo(() => {
    if (!openings) return [] as Opening[];
    return openings.filter(
      (o) => o.wall === 'end_back' && (o.type === 'sectional_gate' || o.type === 'sliding_gate')
    );
  }, [openings]);

  // Dynamic end wall column Z positions incorporating gate jambs
  // For front wall: gate center Z = span - gate.positionX
  const endColZPositionsFront = useMemo(() => {
    if (endFrontGates.length === 0) return endColZPositionsUniform;
    // Start with corner positions
    const positions = new Set<number>([0, span]);
    // Add gate jamb positions
    for (const gate of endFrontGates) {
      const centerZ = span - gate.positionX;
      const leftJamb = centerZ - gate.width / 2;
      const rightJamb = centerZ + gate.width / 2;
      if (leftJamb > 0.01 && leftJamb < span - 0.01) positions.add(leftJamb);
      if (rightJamb > 0.01 && rightJamb < span - 0.01) positions.add(rightJamb);
    }
    // Add filler columns between boundaries (same logic as EndColumns)
    const sorted = [...positions].sort((a, b) => a - b);
    const fillerPositions: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const leftZ = sorted[i];
      const rightZ = sorted[i + 1];
      const gap = rightZ - leftZ;
      // Check if this gap IS the gate span (skip filler inside gate)
      const isGateSpan = endFrontGates.some((gate) => {
        const centerZ = span - gate.positionX;
        const lj = centerZ - gate.width / 2;
        const rj = centerZ + gate.width / 2;
        return Math.abs(leftZ - lj) < 0.01 && Math.abs(rightZ - rj) < 0.01;
      });
      if (isGateSpan) continue;
      if (gap > 3.0) {
        fillerPositions.push(leftZ + gap / 3);
        fillerPositions.push(leftZ + (2 * gap) / 3);
      } else if (gap > 0.5) {
        fillerPositions.push(leftZ + gap / 2);
      }
    }
    for (const p of fillerPositions) positions.add(p);
    return [...positions].sort((a, b) => a - b);
  }, [endFrontGates, endColZPositionsUniform, span]);

  // For back wall: gate center Z = gate.positionX
  const endColZPositionsBack = useMemo(() => {
    if (endBackGates.length === 0) return endColZPositionsUniform;
    // Start with corner positions
    const positions = new Set<number>([0, span]);
    // Add gate jamb positions
    for (const gate of endBackGates) {
      const centerZ = gate.positionX;
      const leftJamb = centerZ - gate.width / 2;
      const rightJamb = centerZ + gate.width / 2;
      if (leftJamb > 0.01 && leftJamb < span - 0.01) positions.add(leftJamb);
      if (rightJamb > 0.01 && rightJamb < span - 0.01) positions.add(rightJamb);
    }
    // Add filler columns between boundaries (same logic as EndColumns)
    const sorted = [...positions].sort((a, b) => a - b);
    const fillerPositions: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const leftZ = sorted[i];
      const rightZ = sorted[i + 1];
      const gap = rightZ - leftZ;
      // Check if this gap IS the gate span (skip filler inside gate)
      const isGateSpan = endBackGates.some((gate) => {
        const centerZ = gate.positionX;
        const lj = centerZ - gate.width / 2;
        const rj = centerZ + gate.width / 2;
        return Math.abs(leftZ - lj) < 0.01 && Math.abs(rightZ - rj) < 0.01;
      });
      if (isGateSpan) continue;
      if (gap > 3.0) {
        fillerPositions.push(leftZ + gap / 3);
        fillerPositions.push(leftZ + (2 * gap) / 3);
      } else if (gap > 0.5) {
        fillerPositions.push(leftZ + gap / 2);
      }
    }
    for (const p of fillerPositions) positions.add(p);
    return [...positions].sort((a, b) => a - b);
  }, [endBackGates, endColZPositionsUniform, span]);




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

  // Joint line (dark strip) material for visible locks/dilation at column positions
  const jointLineMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#404040',
    roughness: 0.6,
    metalness: 0.3,
    depthWrite: true,
  }), []);

  useEffect(() => {
    return () => { jointLineMaterial.dispose(); };
  }, [jointLineMaterial]);

  // Microlining overlay material (slightly darker than sandwich panel, to show groove shadow)
  const microlineMaterialSide = useMemo(() => new THREE.MeshStandardMaterial({
    color: getRALHex(cladding.sideWallColor),
    roughness: 0.4,
    metalness: 0.1,
    side: THREE.FrontSide,
    depthWrite: true,
  }), [cladding.sideWallColor]);

  useEffect(() => {
    return () => { microlineMaterialSide.dispose(); };
  }, [microlineMaterialSide]);

  const microlineMaterialEnd = useMemo(() => new THREE.MeshStandardMaterial({
    color: getRALHex(cladding.endWallColor),
    roughness: 0.4,
    metalness: 0.1,
    side: THREE.FrontSide,
    depthWrite: true,
  }), [cladding.endWallColor]);

  useEffect(() => {
    return () => { microlineMaterialEnd.dispose(); };
  }, [microlineMaterialEnd]);

  // Column X positions for joint lines on side walls
  const columnXPositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i <= numberOfBays; i++) {
      positions.push(i * columnSpacing);
    }
    return positions;
  }, [numberOfBays, columnSpacing]);

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
          const leftEdge = -(endColumnOuterOffset + endWallThicknessOffset) + (isEndWallTrapezoid ? endWallThicknessOffset : sandwichThicknessM / 2) + 0.010;
          const rightEdge = columnSpacing - 0.010;
          panelWidth = rightEdge - leftEdge;
          panelCenterX = (leftEdge + rightEdge) / 2;
        } else if (bayIndex === numberOfBays - 1) {
          const leftEdge = (numberOfBays - 1) * columnSpacing + 0.010;
          const rightEdge = hallLength + (endColumnOuterOffset + endWallThicknessOffset) - (isEndWallTrapezoid ? endWallThicknessOffset : sandwichThicknessM / 2) - 0.010;
          panelWidth = rightEdge - leftEdge;
          panelCenterX = (leftEdge + rightEdge) / 2;
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
          const leftEdge = -(endColumnOuterOffset + endWallThicknessOffset) + (isEndWallTrapezoid ? endWallThicknessOffset : sandwichThicknessM / 2) + 0.010;
          const rightEdge = columnSpacing - 0.010;
          panelWidth = rightEdge - leftEdge;
          panelCenterX = (leftEdge + rightEdge) / 2;
        } else if (bayIndex === numberOfBays - 1) {
          const leftEdge = (numberOfBays - 1) * columnSpacing + 0.010;
          const rightEdge = hallLength + (endColumnOuterOffset + endWallThicknessOffset) - (isEndWallTrapezoid ? endWallThicknessOffset : sandwichThicknessM / 2) - 0.010;
          panelWidth = rightEdge - leftEdge;
          panelCenterX = (leftEdge + rightEdge) / 2;
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



      {/* End wall panels - front (X = -(endColumnOuterOffset + endWallThicknessOffset)) */}
      {(() => {
        const xPos = -(endColumnOuterOffset + endWallThicknessOffset);
        const endWallProfileType: 'T18' | 'T35' = 'T18';
        const panelHeightM = cladding.panelWidth / 1000;
        const numLayers = Math.floor(wallHeight / panelHeightM);
        const elements: React.ReactNode[] = [];

        // Rectangular panels between columns
        for (let i = 0; i < endColZPositionsFront.length - 1; i++) {
          let zLeft = endColZPositionsFront[i];
          let zRight = endColZPositionsFront[i + 1];

          // Fix 2: Widen corner panels to cover side wall thickness
          if (i === 0) {
            zLeft = -(columnOuterFlangeOffset + 2 * sideWallThicknessOffset);
          }
          if (i === endColZPositionsFront.length - 2) {
            zRight = span + columnOuterFlangeOffset + 2 * sideWallThicknessOffset;
          }

          const panelWidth = (zRight - zLeft) - 0.020; // 20mm dilation
          const panelCenterZ = (zLeft + zRight) / 2;



          if (endStripes.length === 0) {
            elements.push(
              <mesh
                key={`end-front-panel-${i}`}
                position={[xPos, wallHeight / 2, panelCenterZ]}
                rotation={[0, Math.PI / 2, 0]}
                material={endWallMat}
                onPointerDown={placementMode ? (e) => handleWallClick('end_front', span, e) : undefined}
              >
                {isEndWallTrapezoid
                  ? <primitive object={createTrapezoidalGeometry(panelWidth, wallHeight, endWallProfileType, wallWaveAxis, true)} attach="geometry" />
                  : <boxGeometry args={[panelWidth, wallHeight, sandwichThicknessM]} />
                }
              </mesh>
            );
          } else {
            // Color stripe segments per panel
            const layerColors: string[] = [];
            for (let layer = 1; layer <= numLayers; layer++) {
              const stripe = endStripes.find(s => layer >= s.layerStart && layer <= s.layerEnd);
              layerColors.push(stripe ? stripe.color : cladding.endWallColor);
            }

            const segments: ColorSegment[] = [];
            if (numLayers > 0) {
              let currentColor = layerColors[0];
              let segStartLayer = 1;
              for (let li = 1; li < layerColors.length; li++) {
                if (layerColors[li] !== currentColor) {
                  segments.push({ startLayer: segStartLayer, endLayer: li, color: currentColor });
                  currentColor = layerColors[li];
                  segStartLayer = li + 1;
                }
              }
              segments.push({ startLayer: segStartLayer, endLayer: numLayers, color: currentColor });
            }

            const coveredHeight = numLayers * panelHeightM;
            const remainder = wallHeight - coveredHeight;

            segments.forEach((seg, segIdx) => {
              let segHeight = (seg.endLayer - seg.startLayer + 1) * panelHeightM;
              const segBottomY = (seg.startLayer - 1) * panelHeightM;
              if (segIdx === segments.length - 1 && remainder > 0.0001) {
                segHeight += remainder;
              }
              const segCenterY = segBottomY + segHeight / 2;
              const segMat = seg.color === cladding.endWallColor ? endWallMat : makeCladdingMaterial(seg.color);

              elements.push(
                <mesh
                  key={`end-front-panel-${i}-seg-${segIdx}`}
                  position={[xPos, segCenterY, panelCenterZ]}
                  rotation={[0, Math.PI / 2, 0]}
                  material={segMat}
                  onPointerDown={placementMode ? (e) => handleWallClick('end_front', span, e) : undefined}
                >
                  {isEndWallTrapezoid
                    ? <primitive object={createTrapezoidalGeometry(panelWidth, segHeight, endWallProfileType, wallWaveAxis, true)} attach="geometry" />
                    : <boxGeometry args={[panelWidth, segHeight, sandwichThicknessM]} />
                  }
                </mesh>
              );
            });
          }
        }

        // One straight cut line: from Y=0 at Z=0/span to Y=ridgeHeight-wallHeight-0.03 at Z=span/2
        // Height at any Z position along this line:
        const roofLineHeightFront = (span / 2) * Math.tan(roofAngleRad) - 0.03; // max height at ridge
        const hAtZFront = (z: number) => {
          const distFromEdge = Math.min(z, span - z); // distance from nearest eave edge
          return Math.max(0, (distFromEdge / (span / 2)) * roofLineHeightFront);
        };

        // Gable panels above wallHeight - per section between columns
        for (let i = 0; i < endColZPositionsFront.length - 1; i++) {
          let zLeft = endColZPositionsFront[i];
          let zRight = endColZPositionsFront[i + 1];

          // Widen corner panels to cover side wall thickness
          if (i === 0) {
            zLeft = -(columnOuterFlangeOffset + 2 * sideWallThicknessOffset);
          }
          if (i === endColZPositionsFront.length - 2) {
            zRight = span + columnOuterFlangeOffset + 2 * sideWallThicknessOffset;
          }

          const panelWidth = (zRight - zLeft) - 0.020; // 20mm dilation
          const panelCenterZ = (zLeft + zRight) / 2;

          // Calculate trapezoid heights at actual panel edges (after dilation)
          const panelLeftEdgeZ = panelCenterZ - panelWidth / 2;
          const panelRightEdgeZ = panelCenterZ + panelWidth / 2;
          const hLeft = hAtZFront(Math.max(0, Math.min(span, panelRightEdgeZ)));
          const hRight = hAtZFront(Math.max(0, Math.min(span, panelLeftEdgeZ)));
          const avgH = (hLeft + hRight) / 2;

          if (avgH < 0.01) continue; // skip negligible panels

          let gableGeo: THREE.BufferGeometry;
          if (isEndWallTrapezoid) {
            gableGeo = createTrapezoidMeshGeometry(panelWidth, hLeft, hRight, 'T18', 'y');
          } else {
            gableGeo = createTrapezoidMeshGeometry(panelWidth, hLeft, hRight, null, 'y');
          }

          elements.push(
            <mesh
              key={`end-front-gable-panel-${i}`}
              position={[xPos, wallHeight, panelCenterZ]}
              rotation={[0, Math.PI / 2, 0]}
              material={endWallMat}
            >
              <primitive object={gableGeo} attach="geometry" />
            </mesh>
          );
        }

        {/* Gable front joint lines above wallHeight */}
        endColZPositionsFront.slice(1, -1).forEach((colZ, idx) => {
          const distFromCenter = Math.abs(colZ - span / 2);
          const lineHeight = (gableTriangleHeight - 0.10) * (1 - distFromCenter / (span / 2));
          if (lineHeight < 0.05) return;
          elements.push(
            <mesh key={`gable-front-joint-${idx}`} position={[-(endColumnOuterOffset + endWallThicknessOffset) - 0.001, wallHeight + lineHeight / 2, colZ]}>
              <boxGeometry args={[0.005, lineHeight, 0.02]} />
              <meshStandardMaterial color="#404040" />
            </mesh>
          );
        });

        return elements;
      })()}

      {/* End wall panels - back (X = hallLength + endColumnOuterOffset + endWallThicknessOffset) */}
      {(() => {
        const xPos = hallLength + endColumnOuterOffset + endWallThicknessOffset;
        const endWallProfileType: 'T18' | 'T35' = 'T18';
        const panelHeightM = cladding.panelWidth / 1000;
        const numLayers = Math.floor(wallHeight / panelHeightM);
        const elements: React.ReactNode[] = [];

        // Rectangular panels between columns
        for (let i = 0; i < endColZPositionsBack.length - 1; i++) {
          let zLeft = endColZPositionsBack[i];
          let zRight = endColZPositionsBack[i + 1];

          // Fix 2: Widen corner panels to cover side wall thickness
          if (i === 0) {
            zLeft = -(columnOuterFlangeOffset + 2 * sideWallThicknessOffset);
          }
          if (i === endColZPositionsBack.length - 2) {
            zRight = span + columnOuterFlangeOffset + 2 * sideWallThicknessOffset;
          }

          const panelWidth = (zRight - zLeft) - 0.020; // 20mm dilation
          const panelCenterZ = (zLeft + zRight) / 2;



          if (endStripes.length === 0) {
            elements.push(
              <mesh
                key={`end-back-panel-${i}`}
                position={[xPos, wallHeight / 2, panelCenterZ]}
                rotation={[0, -Math.PI / 2, 0]}
                material={endWallMat}
                onPointerDown={placementMode ? (e) => handleWallClick('end_back', span, e) : undefined}
              >
                {isEndWallTrapezoid
                  ? <primitive object={createTrapezoidalGeometry(panelWidth, wallHeight, endWallProfileType, wallWaveAxis, true)} attach="geometry" />
                  : <boxGeometry args={[panelWidth, wallHeight, sandwichThicknessM]} />
                }
              </mesh>
            );
          } else {
            // Color stripe segments per panel
            const layerColors: string[] = [];
            for (let layer = 1; layer <= numLayers; layer++) {
              const stripe = endStripes.find(s => layer >= s.layerStart && layer <= s.layerEnd);
              layerColors.push(stripe ? stripe.color : cladding.endWallColor);
            }

            const segments: ColorSegment[] = [];
            if (numLayers > 0) {
              let currentColor = layerColors[0];
              let segStartLayer = 1;
              for (let li = 1; li < layerColors.length; li++) {
                if (layerColors[li] !== currentColor) {
                  segments.push({ startLayer: segStartLayer, endLayer: li, color: currentColor });
                  currentColor = layerColors[li];
                  segStartLayer = li + 1;
                }
              }
              segments.push({ startLayer: segStartLayer, endLayer: numLayers, color: currentColor });
            }

            const coveredHeight = numLayers * panelHeightM;
            const remainder = wallHeight - coveredHeight;

            segments.forEach((seg, segIdx) => {
              let segHeight = (seg.endLayer - seg.startLayer + 1) * panelHeightM;
              const segBottomY = (seg.startLayer - 1) * panelHeightM;
              if (segIdx === segments.length - 1 && remainder > 0.0001) {
                segHeight += remainder;
              }
              const segCenterY = segBottomY + segHeight / 2;
              const segMat = seg.color === cladding.endWallColor ? endWallMat : makeCladdingMaterial(seg.color);

              elements.push(
                <mesh
                  key={`end-back-panel-${i}-seg-${segIdx}`}
                  position={[xPos, segCenterY, panelCenterZ]}
                  rotation={[0, -Math.PI / 2, 0]}
                  material={segMat}
                  onPointerDown={placementMode ? (e) => handleWallClick('end_back', span, e) : undefined}
                >
                  {isEndWallTrapezoid
                    ? <primitive object={createTrapezoidalGeometry(panelWidth, segHeight, endWallProfileType, wallWaveAxis, true)} attach="geometry" />
                    : <boxGeometry args={[panelWidth, segHeight, sandwichThicknessM]} />
                  }
                </mesh>
              );
            });
          }
        }

        // One straight cut line: from Y=0 at Z=0/span to Y=ridgeHeight-wallHeight-0.03 at Z=span/2
        // Height at any Z position along this line:
        const roofLineHeightBack = (span / 2) * Math.tan(roofAngleRad) - 0.03; // max height at ridge
        const hAtZBack = (z: number) => {
          const distFromEdge = Math.min(z, span - z); // distance from nearest eave edge
          return Math.max(0, (distFromEdge / (span / 2)) * roofLineHeightBack);
        };

        // Gable panels above wallHeight - per section between columns
        for (let i = 0; i < endColZPositionsBack.length - 1; i++) {
          let zLeft = endColZPositionsBack[i];
          let zRight = endColZPositionsBack[i + 1];

          // Widen corner panels to cover side wall thickness
          if (i === 0) {
            zLeft = -(columnOuterFlangeOffset + 2 * sideWallThicknessOffset);
          }
          if (i === endColZPositionsBack.length - 2) {
            zRight = span + columnOuterFlangeOffset + 2 * sideWallThicknessOffset;
          }

          const panelWidth = (zRight - zLeft) - 0.020; // 20mm dilation
          const panelCenterZ = (zLeft + zRight) / 2;

          // Calculate trapezoid heights at actual panel edges (after dilation)
          const panelLeftEdgeZ = panelCenterZ - panelWidth / 2;
          const panelRightEdgeZ = panelCenterZ + panelWidth / 2;
          const hLeft = hAtZBack(Math.max(0, Math.min(span, panelLeftEdgeZ)));
          const hRight = hAtZBack(Math.max(0, Math.min(span, panelRightEdgeZ)));
          const avgH = (hLeft + hRight) / 2;

          if (avgH < 0.01) continue; // skip negligible panels

          let gableGeo: THREE.BufferGeometry;
          if (isEndWallTrapezoid) {
            gableGeo = createTrapezoidMeshGeometry(panelWidth, hLeft, hRight, 'T18', 'y');
          } else {
            gableGeo = createTrapezoidMeshGeometry(panelWidth, hLeft, hRight, null, 'y');
          }

          elements.push(
            <mesh
              key={`end-back-gable-panel-${i}`}
              position={[xPos, wallHeight, panelCenterZ]}
              rotation={[0, -Math.PI / 2, 0]}
              material={endWallMat}
            >
              <primitive object={gableGeo} attach="geometry" />
            </mesh>
          );
        }

        {/* Gable back joint lines above wallHeight */}
        endColZPositionsBack.slice(1, -1).forEach((colZ, idx) => {
          const distFromCenter = Math.abs(colZ - span / 2);
          const lineHeight = (gableTriangleHeight - 0.10) * (1 - distFromCenter / (span / 2));
          if (lineHeight < 0.05) return;
          elements.push(
            <mesh key={`gable-back-joint-${idx}`} position={[hallLength + endColumnOuterOffset + endWallThicknessOffset + 0.001, wallHeight + lineHeight / 2, colZ]}>
              <boxGeometry args={[0.005, lineHeight, 0.02]} />
              <meshStandardMaterial color="#404040" />
            </mesh>
          );
        });

        return elements;
      })()}



      {/* Roof - left slope (Z=0 side going up to ridge) */}
      {/* Roof panels extend beyond side walls by eaveOverhang */}
      {(() => {
        // Roof center Y: bottom surface of roof box at eave must align with wallHeight (purlin tops)
        // After rotation by (PI/2 - angle) around X:
        // bottomEdge Y = centerY - (slopeLength/2) * sin(angle) - (thickness/2) * cos(angle)
        // Set bottomEdge Y = wallHeight:
        const roofCenterY = wallHeight + (roofSlopeLengthWithOverhang / 2) * Math.sin(roofAngleRad) + (roofThickness / 2) * Math.cos(roofAngleRad);
        // Z positions: center of each slope
        const leftRoofCenterZ = (span / 2) - (roofSlopeLengthWithOverhang / 2) * Math.cos(roofAngleRad);
        const rightRoofCenterZ = (span / 2) + (roofSlopeLengthWithOverhang / 2) * Math.cos(roofAngleRad);
        return (
          <>
            <mesh
              position={[
                hallLength / 2,
                roofCenterY,
                leftRoofCenterZ,
              ]}
              rotation={[Math.PI / 2 - roofAngleRad, 0, 0]}
              geometry={roofGeometry}
              material={roofMat}
            />

            {/* Roof - right slope (Z=span side going up to ridge) */}
            <mesh
              position={[
                hallLength / 2,
                roofCenterY,
                rightRoofCenterZ,
              ]}
              rotation={[-(Math.PI / 2 - roofAngleRad), 0, 0]}
              geometry={roofGeometryRight}
              material={roofMat}
            />
          </>
        );
      })()}

      {/* Microlining overlay on sandwich side walls (V-groove texture) */}
      {!isSideWallTrapezoid && Array.from({ length: numberOfBays }).map((_, bayIndex) => {
        const bayStart = bayIndex * columnSpacing;
        const bayEnd = (bayIndex + 1) * columnSpacing;
        let panelWidth = columnSpacing - 0.020;
        let panelCenterX = (bayStart + bayEnd) / 2;

        if (bayIndex === 0) {
          const leftEdge = -(endColumnOuterOffset + endWallThicknessOffset) + (isEndWallTrapezoid ? endWallThicknessOffset : sandwichThicknessM / 2) + 0.010;
          const rightEdge = columnSpacing - 0.010;
          panelWidth = rightEdge - leftEdge;
          panelCenterX = (leftEdge + rightEdge) / 2;
        } else if (bayIndex === numberOfBays - 1) {
          const leftEdge = (numberOfBays - 1) * columnSpacing + 0.010;
          const rightEdge = hallLength + (endColumnOuterOffset + endWallThicknessOffset) - (isEndWallTrapezoid ? endWallThicknessOffset : sandwichThicknessM / 2) - 0.010;
          panelWidth = rightEdge - leftEdge;
          panelCenterX = (leftEdge + rightEdge) / 2;
        }

        const zLeft = -(columnOuterFlangeOffset + sideWallThicknessOffset) - 0.001;
        const zRight = span + columnOuterFlangeOffset + sideWallThicknessOffset + 0.001;

        return (
          <React.Fragment key={`microline-side-${bayIndex}`}>
            {/* Left wall microlining */}
            <mesh
              position={[panelCenterX, sideWallHeight / 2, zLeft]}
              material={microlineMaterialSide}
            >
              <primitive object={createMicrolinedGeometry(panelWidth, sideWallHeight)} attach="geometry" />
            </mesh>
            {/* Right wall microlining */}
            <mesh
              position={[panelCenterX, sideWallHeight / 2, zRight]}
              rotation={[0, Math.PI, 0]}
              material={microlineMaterialSide}
            >
              <primitive object={createMicrolinedGeometry(panelWidth, sideWallHeight)} attach="geometry" />
            </mesh>
          </React.Fragment>
        );
      })}

      {/* Joint lines (dark dilation strips) at column positions on side walls */}
      {columnXPositions.map((xPos, idx) => {
        const zLeft = -(columnOuterFlangeOffset + sideWallThicknessOffset);
        const zRight = span + columnOuterFlangeOffset + sideWallThicknessOffset;
        return (
          <React.Fragment key={`joint-${idx}`}>
            {/* Left wall joint */}
            <mesh
              position={[xPos, sideWallHeight / 2, zLeft]}
              material={jointLineMaterial}
            >
              <boxGeometry args={[0.005, sideWallHeight, 0.020]} />
            </mesh>
            {/* Right wall joint */}
            <mesh
              position={[xPos, sideWallHeight / 2, zRight]}
              material={jointLineMaterial}
            >
              <boxGeometry args={[0.005, sideWallHeight, 0.020]} />
            </mesh>
          </React.Fragment>
        );
      })}

      {/* Corner joint lines */}
      {([
        [-(endColumnOuterOffset + endWallThicknessOffset), -(columnOuterFlangeOffset + sideWallThicknessOffset)],
        [-(endColumnOuterOffset + endWallThicknessOffset), span + columnOuterFlangeOffset + sideWallThicknessOffset],
        [hallLength + endColumnOuterOffset + endWallThicknessOffset, -(columnOuterFlangeOffset + sideWallThicknessOffset)],
        [hallLength + endColumnOuterOffset + endWallThicknessOffset, span + columnOuterFlangeOffset + sideWallThicknessOffset],
      ] as [number, number][]).map(([cx, cz], i) => (
        <mesh key={`corner-joint-${i}`} position={[cx, wallHeight / 2, cz]}>
          <boxGeometry args={[0.01, wallHeight, 0.01]} />
          <meshStandardMaterial color="#303030" />
        </mesh>
      ))}


    </group>
  );
});


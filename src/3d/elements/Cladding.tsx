import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { getRALHex } from '../../data/colors';
import { checkCollision, fitsInWall } from './Openings';
import type { HallParameters, CladdingParameters, ColorStripe, Opening, OpeningType, WallIdentifier } from '../../types';

interface CladdingProps {
  params: HallParameters;
  cladding: CladdingParameters;
  showCladding: boolean;
  columnOuterFlangeOffset: number;
  columnSpacing: number;
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

/**
 * Renders color stripe patches on a wall surface.
 */
function ColorStripePatches({
  stripes,
  wallWidth,
  wallHeight,
  panelWidth,
  position,
  rotation,
}: {
  stripes: ColorStripe[];
  wallWidth: number;
  wallHeight: number;
  panelWidth: number;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const panelHeightM = panelWidth / 1000; // convert mm to m
  const maxLayers = Math.floor(wallHeight / panelHeightM);

  const patches = useMemo(() => {
    return stripes.map((stripe) => {
      const startLayer = Math.max(1, stripe.layerStart);
      const endLayer = Math.min(maxLayers, stripe.layerEnd);
      if (startLayer > endLayer) return null;

      const yStart = (startLayer - 1) * panelHeightM;
      const patchHeight = (endLayer - startLayer + 1) * panelHeightM;
      const yCenter = yStart + patchHeight / 2;

      return {
        key: `${stripe.wallType}-${startLayer}-${endLayer}-${stripe.color}`,
        yCenter,
        patchHeight,
        color: stripe.color,
      };
    }).filter(Boolean) as Array<{ key: string; yCenter: number; patchHeight: number; color: string }>;
  }, [stripes, maxLayers, panelHeightM]);

  return (
    <group position={position} rotation={rotation}>
      {patches.map((patch) => (
        <mesh key={patch.key} position={[0, patch.yCenter - wallHeight / 2, 0.01]}>
          <planeGeometry args={[wallWidth, patch.patchHeight]} />
          <meshStandardMaterial
            color={getRALHex(patch.color)}
            opacity={1.0}
            side={THREE.DoubleSide}
            depthWrite={true}
          />
        </mesh>
      ))}
    </group>
  );
}

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
  columnSpacing,
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

  const sideWallGeometry = useMemo(() => {
    if (isSideWallTrapezoid) {
      return createTrapezoidalGeometry(hallLength, wallHeight, 'T18', wallWaveAxis, true);
    }
    // Sandwich: BoxGeometry with configurable thickness
    const thickness = (cladding.sandwichThickness ?? 100) / 1000;
    return new THREE.BoxGeometry(hallLength, wallHeight, thickness);
  }, [hallLength, wallHeight, isSideWallTrapezoid, wallWaveAxis, cladding.sandwichThickness]);

  const endWallWidth = span + 2 * (columnOuterFlangeOffset + sideWallThicknessOffset);

  const endWallGeometry = useMemo(() => {
    if (isEndWallTrapezoid) {
      return createTrapezoidalGeometry(endWallWidth, wallHeight, 'T18', wallWaveAxis, true);
    }
    // Sandwich: BoxGeometry with configurable thickness
    const thickness = (cladding.sandwichThickness ?? 100) / 1000;
    return new THREE.BoxGeometry(endWallWidth, wallHeight, thickness);
  }, [endWallWidth, wallHeight, isEndWallTrapezoid, wallWaveAxis, cladding.sandwichThickness]);

  // Roof geometry: ribs run along the slope (from ridge to eave).
  // The plane is hallLength x roofSlopeLengthWithOverhang.
  // On the plane, X = along building length, Y = along slope.
  // Ribs along slope means wave varies along X (perpendicular to slope direction),
  // so each rib stripe runs along Y (the slope direction).
  // Actually: "garby wzdluz spadku" means ridges go from ridge to eave = along Y on the plane.
  // That means the wave pattern repeats along X. So waveAxis = 'x'.
  const roofWidth = hallLength;
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
    return () => { sideWallGeometry.dispose(); };
  }, [sideWallGeometry]);
  useEffect(() => {
    return () => { endWallGeometry.dispose(); };
  }, [endWallGeometry]);
  useEffect(() => {
    return () => { roofGeometry.dispose(); };
  }, [roofGeometry]);

  // Materials
  const sideWallMat = useMemo(() => makeCladdingMaterial(cladding.sideWallColor), [cladding.sideWallColor]);
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
  const endStripes = useMemo(
    () => cladding.colorStripes.filter((s) => s.wallType === 'end'),
    [cladding.colorStripes]
  );

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
      {/* Side wall Z=-offset (left, Z=0 side) */}
      <mesh
        position={[hallLength / 2, wallHeight / 2, -(columnOuterFlangeOffset + sideWallThicknessOffset)]}
        geometry={sideWallGeometry}
        material={sideWallMat}
        onPointerDown={placementMode ? (e) => handleWallClick('side_left', hallLength, e) : undefined}
      />

      {/* Side wall Z=span+offset (right, Z=span side) */}
      <mesh
        position={[hallLength / 2, wallHeight / 2, span + columnOuterFlangeOffset + sideWallThicknessOffset]}
        rotation={[0, Math.PI, 0]}
        geometry={sideWallGeometry}
        material={sideWallMat}
        onPointerDown={placementMode ? (e) => handleWallClick('side_right', hallLength, e) : undefined}
      />

      {/* Side wall color stripes - front */}
      {cladding.panelOrientation === 'horizontal' && sideStripes.length > 0 && (
        <ColorStripePatches
          stripes={sideStripes}
          wallWidth={hallLength}
          wallHeight={wallHeight}
          panelWidth={cladding.panelWidth}
          position={[hallLength / 2, wallHeight / 2, -(columnOuterFlangeOffset + sideWallThicknessOffset)]}
          rotation={[0, 0, 0]}
        />
      )}

      {/* Side wall color stripes - back */}
      {cladding.panelOrientation === 'horizontal' && sideStripes.length > 0 && (
        <ColorStripePatches
          stripes={sideStripes}
          wallWidth={hallLength}
          wallHeight={wallHeight}
          panelWidth={cladding.panelWidth}
          position={[hallLength / 2, wallHeight / 2, span + columnOuterFlangeOffset + sideWallThicknessOffset]}
          rotation={[0, Math.PI, 0]}
        />
      )}

      {/* End wall X=-offset (front gable) - rectangular part */}
      <mesh
        position={[-endWallThicknessOffset, wallHeight / 2, span / 2]}
        rotation={[0, Math.PI / 2, 0]}
        geometry={endWallGeometry}
        material={endWallMat}
        onPointerDown={placementMode ? (e) => handleWallClick('end_front', span, e) : undefined}
      />

      {/* End wall X=-offset - gable triangle */}
      <mesh
        position={[-endWallThicknessOffset, wallHeight + gableTriangleHeight / 2, span / 2]}
        rotation={[0, Math.PI / 2, 0]}
        material={endWallMat}
      >
        <GableTriangleGeometry width={span} height={gableTriangleHeight} />
      </mesh>

      {/* End wall X=hallLength+offset (back gable) - rectangular part */}
      <mesh
        position={[hallLength + endWallThicknessOffset, wallHeight / 2, span / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        geometry={endWallGeometry}
        material={endWallMat}
        onPointerDown={placementMode ? (e) => handleWallClick('end_back', span, e) : undefined}
      />

      {/* End wall X=hallLength+offset - gable triangle */}
      <mesh
        position={[hallLength + endWallThicknessOffset, wallHeight + gableTriangleHeight / 2, span / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        material={endWallMat}
      >
        <GableTriangleGeometry width={span} height={gableTriangleHeight} />
      </mesh>

      {/* End wall color stripes - X=-offset */}
      {cladding.panelOrientation === 'horizontal' && endStripes.length > 0 && (
        <ColorStripePatches
          stripes={endStripes}
          wallWidth={span}
          wallHeight={wallHeight}
          panelWidth={cladding.panelWidth}
          position={[-endWallThicknessOffset, wallHeight / 2, span / 2]}
          rotation={[0, Math.PI / 2, 0]}
        />
      )}

      {/* End wall color stripes - X=hallLength+offset */}
      {cladding.panelOrientation === 'horizontal' && endStripes.length > 0 && (
        <ColorStripePatches
          stripes={endStripes}
          wallWidth={span}
          wallHeight={wallHeight}
          panelWidth={cladding.panelWidth}
          position={[hallLength + endWallThicknessOffset, wallHeight / 2, span / 2]}
          rotation={[0, -Math.PI / 2, 0]}
        />
      )}

      {/* Roof - left slope (Z=0 side going up to ridge) */}
      {/* Roof panels extend beyond side walls by eaveOverhang */}
      <mesh
        position={[
          hallLength / 2,
          wallHeight + gableTriangleHeight / 2 + 0.003,
          span / 4,
        ]}
        rotation={[Math.PI / 2 - roofAngleRad, 0, 0]}
        geometry={roofGeometry}
        material={roofMat}
      />

      {/* Roof - right slope (Z=span side going up to ridge) */}
      <mesh
        position={[
          hallLength / 2,
          wallHeight + gableTriangleHeight / 2 + 0.003,
          (3 * span) / 4,
        ]}
        rotation={[-(Math.PI / 2 - roofAngleRad), 0, 0]}
        geometry={roofGeometry}
        material={roofMat}
      />
    </group>
  );
});

/**
 * Custom gable triangle geometry component (isoceles triangle).
 */
function GableTriangleGeometry({ width, height }: { width: number; height: number }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(0, height / 2);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [width, height]);

  return <primitive object={geometry} attach="geometry" />;
}

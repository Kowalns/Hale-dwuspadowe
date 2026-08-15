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
 * Creates a PlaneGeometry with sinusoidal vertex displacement for trapezoidal profiles.
 * Waves run along the localWaveAxis ('x' for walls = vertical ribs, 'y' for roof = ribs along slope).
 * Displacement is applied along the Z normal of the plane.
 */
function createTrapezoidalGeometry(
  width: number,
  height: number,
  amplitude: number,
  period: number,
  waveAxis: 'x' | 'y',
): THREE.PlaneGeometry {
  // Scale segments based on wave period to avoid under-sampling on long walls.
  // At least 4 segments per wave cycle ensures smooth sinusoidal appearance.
  // Capped to avoid excessive memory usage.
  const segmentsW = Math.min(Math.ceil(width / period) * 4, 800);
  const segmentsH = Math.min(Math.ceil(height / period) * 4, 400);
  const geo = new THREE.PlaneGeometry(width, height, segmentsW, segmentsH);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Determine the coordinate along which the wave varies
    const coord = waveAxis === 'x' ? x : y;
    const displacement = amplitude * Math.sin((2 * Math.PI * coord) / period);
    pos.setZ(i, displacement);
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
 * Walls are PlaneGeometry, roof is two tilted planes matching roof slope.
 * Trapezoidal profiles get sinusoidal vertex displacement.
 * Color stripes are offset patches on top of the main wall surface.
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

  // Determine trapezoidal parameters for walls
  const isWallTrapezoid = cladding.sideWallType === 'trapezoid';
  // For side walls, use T18 profile (18mm amplitude, 100mm period) as default trapezoidal
  const wallAmplitude = isWallTrapezoid ? 0.018 : 0;
  const wallPeriod = isWallTrapezoid ? 0.100 : 1;

  // Determine trapezoidal parameters for roof
  const isRoofTrapezoid = cladding.roofType === 'T18' || cladding.roofType === 'T35';
  const roofAmplitude = cladding.roofType === 'T35' ? 0.035 : cladding.roofType === 'T18' ? 0.018 : 0;
  const roofPeriod = cladding.roofType === 'T35' ? 0.150 : cladding.roofType === 'T18' ? 0.100 : 1;

  // Wall geometries with optional sinusoidal displacement
  const sideWallGeometry = useMemo(() => {
    if (isWallTrapezoid) {
      return createTrapezoidalGeometry(hallLength, wallHeight, wallAmplitude, wallPeriod, 'x');
    }
    return new THREE.PlaneGeometry(hallLength, wallHeight);
  }, [hallLength, wallHeight, isWallTrapezoid, wallAmplitude, wallPeriod]);

  const endWallGeometry = useMemo(() => {
    if (cladding.endWallType === 'trapezoid') {
      return createTrapezoidalGeometry(span, wallHeight, wallAmplitude, wallPeriod, 'x');
    }
    return new THREE.PlaneGeometry(span, wallHeight);
  }, [span, wallHeight, cladding.endWallType, wallAmplitude, wallPeriod]);

  // Roof geometry with optional sinusoidal displacement along slope
  const roofGeometry = useMemo(() => {
    if (isRoofTrapezoid) {
      // hallLength is width (along building), roofSlopeLength is height (along slope)
      // Waves run along slope = vary along Y axis of the plane (roofSlopeLength dimension)
      return createTrapezoidalGeometry(hallLength, roofSlopeLength, roofAmplitude, roofPeriod, 'y');
    }
    return new THREE.PlaneGeometry(hallLength, roofSlopeLength);
  }, [hallLength, roofSlopeLength, isRoofTrapezoid, roofAmplitude, roofPeriod]);

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
        position={[hallLength / 2, wallHeight / 2, -columnOuterFlangeOffset]}
        geometry={sideWallGeometry}
        material={sideWallMat}
        onPointerDown={placementMode ? (e) => handleWallClick('side_left', hallLength, e) : undefined}
      />

      {/* Side wall Z=span+offset (right, Z=span side) */}
      <mesh
        position={[hallLength / 2, wallHeight / 2, span + columnOuterFlangeOffset]}
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
          position={[hallLength / 2, wallHeight / 2, -columnOuterFlangeOffset]}
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
          position={[hallLength / 2, wallHeight / 2, span + columnOuterFlangeOffset]}
          rotation={[0, Math.PI, 0]}
        />
      )}

      {/* End wall X=-offset (front gable) - rectangular part */}
      <mesh
        position={[-columnOuterFlangeOffset, wallHeight / 2, span / 2]}
        rotation={[0, Math.PI / 2, 0]}
        geometry={endWallGeometry}
        material={endWallMat}
        onPointerDown={placementMode ? (e) => handleWallClick('end_front', span, e) : undefined}
      />

      {/* End wall X=-offset - gable triangle */}
      <mesh
        position={[-columnOuterFlangeOffset, wallHeight + gableTriangleHeight / 2, span / 2]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <GableTriangleGeometry width={span} height={gableTriangleHeight} />
        <meshStandardMaterial
          color={getRALHex(cladding.endWallColor)}
          opacity={1.0}
          side={THREE.DoubleSide}
          depthWrite={true}
        />
      </mesh>

      {/* End wall X=hallLength+offset (back gable) - rectangular part */}
      <mesh
        position={[hallLength + columnOuterFlangeOffset, wallHeight / 2, span / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        geometry={endWallGeometry}
        material={endWallMat}
        onPointerDown={placementMode ? (e) => handleWallClick('end_back', span, e) : undefined}
      />

      {/* End wall X=hallLength+offset - gable triangle */}
      <mesh
        position={[hallLength + columnOuterFlangeOffset, wallHeight + gableTriangleHeight / 2, span / 2]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <GableTriangleGeometry width={span} height={gableTriangleHeight} />
        <meshStandardMaterial
          color={getRALHex(cladding.endWallColor)}
          opacity={1.0}
          side={THREE.DoubleSide}
          depthWrite={true}
        />
      </mesh>

      {/* End wall color stripes - X=-offset */}
      {cladding.panelOrientation === 'horizontal' && endStripes.length > 0 && (
        <ColorStripePatches
          stripes={endStripes}
          wallWidth={span}
          wallHeight={wallHeight}
          panelWidth={cladding.panelWidth}
          position={[-columnOuterFlangeOffset, wallHeight / 2, span / 2]}
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
          position={[hallLength + columnOuterFlangeOffset, wallHeight / 2, span / 2]}
          rotation={[0, -Math.PI / 2, 0]}
        />
      )}

      {/* Roof - left slope (Z=0 side going up to ridge) */}
      <mesh
        position={[
          hallLength / 2,
          wallHeight + gableTriangleHeight / 2,
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
          wallHeight + gableTriangleHeight / 2,
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

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
  placementMode?: boolean;
  openings?: Opening[];
  onPlaceOpening?: (opening: Opening) => void;
  selectedOpeningType?: OpeningType;
  openingWidth?: number;
  openingHeight?: number;
  sillHeight?: number;
}

/**
 * Creates a transparent material for a given RAL color code.
 */
function makeCladdingMaterial(ralCode: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: getRALHex(ralCode),
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
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
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Cladding component rendering walls and roof panels with RAL colors.
 * Walls are PlaneGeometry, roof is two tilted planes matching roof slope.
 * Color stripes are offset patches on top of the main wall surface.
 */
export const Cladding = React.memo(function Cladding({
  params,
  cladding,
  showCladding,
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
   */
  const handleWallClick = (wall: WallIdentifier, wallWidth: number, event: ThreeEvent<PointerEvent>) => {
    if (!placementMode || !onPlaceOpening || !selectedOpeningType) return;
    event.stopPropagation();

    const w = openingWidth ?? 1;
    const h = openingHeight ?? 1;

    // Get the local point on the plane geometry
    // PlaneGeometry has center at origin, so localPoint.x ranges from -wallWidth/2 to wallWidth/2
    // and localPoint.y ranges from -wallHeight/2 to wallHeight/2
    const localPoint = event.point.clone();
    const mesh = event.object as THREE.Mesh;
    mesh.worldToLocal(localPoint);

    // Convert from plane-local to wall-local coordinates
    // Plane center is at (0,0) of the plane, so:
    // positionX (along wall) = localPoint.x + wallWidth/2
    // positionY (from ground) = localPoint.y + wallHeight/2
    let posX = localPoint.x + wallWidth / 2;
    let posY = localPoint.y + wallHeight / 2;

    // Snap to 100mm grid
    posX = Math.round(posX * 10) / 10;
    posY = Math.round(posY * 10) / 10;

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
      {/* Side wall Z=0 (front) */}
      <mesh
        position={[hallLength / 2, wallHeight / 2, 0]}
        material={sideWallMat}
        onPointerDown={placementMode ? (e) => handleWallClick('side_left', hallLength, e) : undefined}
      >
        <planeGeometry args={[hallLength, wallHeight]} />
      </mesh>

      {/* Side wall Z=span (back) */}
      <mesh
        position={[hallLength / 2, wallHeight / 2, span]}
        rotation={[0, Math.PI, 0]}
        material={sideWallMat}
        onPointerDown={placementMode ? (e) => handleWallClick('side_right', hallLength, e) : undefined}
      >
        <planeGeometry args={[hallLength, wallHeight]} />
      </mesh>

      {/* Side wall color stripes - front */}
      {cladding.panelOrientation === 'horizontal' && sideStripes.length > 0 && (
        <ColorStripePatches
          stripes={sideStripes}
          wallWidth={hallLength}
          wallHeight={wallHeight}
          panelWidth={cladding.panelWidth}
          position={[hallLength / 2, wallHeight / 2, 0]}
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
          position={[hallLength / 2, wallHeight / 2, span]}
          rotation={[0, Math.PI, 0]}
        />
      )}

      {/* End wall X=0 (left gable) - rectangular part */}
      <mesh
        position={[0, wallHeight / 2, span / 2]}
        rotation={[0, Math.PI / 2, 0]}
        material={endWallMat}
        onPointerDown={placementMode ? (e) => handleWallClick('end_front', span, e) : undefined}
      >
        <planeGeometry args={[span, wallHeight]} />
      </mesh>

      {/* End wall X=0 - gable triangle */}
      <mesh
        position={[0, wallHeight + gableTriangleHeight / 2, span / 2]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <GableTriangleGeometry width={span} height={gableTriangleHeight} />
        <meshStandardMaterial
          color={getRALHex(cladding.endWallColor)}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* End wall X=hallLength (right gable) - rectangular part */}
      <mesh
        position={[hallLength, wallHeight / 2, span / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        material={endWallMat}
        onPointerDown={placementMode ? (e) => handleWallClick('end_back', span, e) : undefined}
      >
        <planeGeometry args={[span, wallHeight]} />
      </mesh>

      {/* End wall X=hallLength - gable triangle */}
      <mesh
        position={[hallLength, wallHeight + gableTriangleHeight / 2, span / 2]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <GableTriangleGeometry width={span} height={gableTriangleHeight} />
        <meshStandardMaterial
          color={getRALHex(cladding.endWallColor)}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* End wall color stripes - X=0 */}
      {cladding.panelOrientation === 'horizontal' && endStripes.length > 0 && (
        <ColorStripePatches
          stripes={endStripes}
          wallWidth={span}
          wallHeight={wallHeight}
          panelWidth={cladding.panelWidth}
          position={[0, wallHeight / 2, span / 2]}
          rotation={[0, Math.PI / 2, 0]}
        />
      )}

      {/* End wall color stripes - X=hallLength */}
      {cladding.panelOrientation === 'horizontal' && endStripes.length > 0 && (
        <ColorStripePatches
          stripes={endStripes}
          wallWidth={span}
          wallHeight={wallHeight}
          panelWidth={cladding.panelWidth}
          position={[hallLength, wallHeight / 2, span / 2]}
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
        material={roofMat}
      >
        <planeGeometry args={[hallLength, roofSlopeLength]} />
      </mesh>

      {/* Roof - right slope (Z=span side going up to ridge) */}
      <mesh
        position={[
          hallLength / 2,
          wallHeight + gableTriangleHeight / 2,
          (3 * span) / 4,
        ]}
        rotation={[-(Math.PI / 2 - roofAngleRad), 0, 0]}
        material={roofMat}
      >
        <planeGeometry args={[hallLength, roofSlopeLength]} />
      </mesh>
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

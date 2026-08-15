import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getRALHex } from '../../data/colors';
import type { HallParameters, CladdingParameters, ColorStripe } from '../../types';

interface CladdingProps {
  params: HallParameters;
  cladding: CladdingParameters;
  showCladding: boolean;
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

  // Side wall stripes
  const sideStripes = useMemo(
    () => cladding.colorStripes.filter((s) => s.wallType === 'side'),
    [cladding.colorStripes]
  );
  const endStripes = useMemo(
    () => cladding.colorStripes.filter((s) => s.wallType === 'end'),
    [cladding.colorStripes]
  );

  if (!showCladding) return null;

  return (
    <group name="cladding">
      {/* Side wall Z=0 (front) */}
      <mesh
        position={[hallLength / 2, wallHeight / 2, 0]}
        material={sideWallMat}
      >
        <planeGeometry args={[hallLength, wallHeight]} />
      </mesh>

      {/* Side wall Z=span (back) */}
      <mesh
        position={[hallLength / 2, wallHeight / 2, span]}
        rotation={[0, Math.PI, 0]}
        material={sideWallMat}
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

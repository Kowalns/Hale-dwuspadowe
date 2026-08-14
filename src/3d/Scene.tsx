import { useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { HallModel } from './HallModel';
import type { HallParameters, CalculationResults } from '../types';
import type { ViewPreset } from '../components/ViewPresets';
import * as THREE from 'three';

interface SceneProps {
  params: HallParameters;
  results: CalculationResults;
  viewPreset: ViewPreset | null;
  onViewPresetApplied: () => void;
}

function CameraController({
  viewPreset,
  onApplied,
}: {
  viewPreset: ViewPreset | null;
  onApplied: () => void;
}) {
  const { camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  const applyPreset = useCallback(() => {
    if (viewPreset && controlsRef.current) {
      camera.position.set(...viewPreset.position);
      controlsRef.current.target.set(...viewPreset.target);
      controlsRef.current.update();
      onApplied();
    }
  }, [viewPreset, camera, onApplied]);

  useEffect(() => {
    applyPreset();
  }, [applyPreset]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={5}
      maxDistance={200}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}

function SceneContent({ params, results, viewPreset, onViewPresetApplied }: SceneProps) {
  const maxDim = Math.max(params.length, params.span, results.ridgeHeight);
  const shadowSize = maxDim * 1.5;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[maxDim * 0.5, maxDim * 1.2, maxDim * 0.5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={shadowSize * 3}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
      />
      <directionalLight position={[-maxDim * 0.3, maxDim * 0.5, -maxDim * 0.3]} intensity={0.3} />

      {/* Ground plane with shadow receiver */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[shadowSize * 2, shadowSize * 2]} />
        <shadowMaterial transparent opacity={0.3} />
      </mesh>

      {/* Grid helper */}
      <Grid
        position={[0, 0, 0]}
        args={[maxDim * 3, maxDim * 3] as [number, number]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#0f3460"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#16213e"
        fadeDistance={maxDim * 2}
        infiniteGrid
      />

      {/* Structural model */}
      <HallModel params={params} results={results} />

      {/* Camera controls */}
      <CameraController viewPreset={viewPreset} onApplied={onViewPresetApplied} />
    </>
  );
}

export function Scene({ params, results, viewPreset, onViewPresetApplied }: SceneProps) {
  const maxDim = Math.max(params.length, params.span, results.ridgeHeight);
  const cameraDistance = maxDim * 1.2;

  return (
    <Canvas
      shadows
      camera={{ position: [cameraDistance, cameraDistance * 0.7, cameraDistance], fov: 50 }}
      gl={{ antialias: true }}
      className="w-full h-full"
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <SceneContent
        params={params}
        results={results}
        viewPreset={viewPreset}
        onViewPresetApplied={onViewPresetApplied}
      />
    </Canvas>
  );
}

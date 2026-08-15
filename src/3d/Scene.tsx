import { useRef, useMemo } from 'react'
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { HallModel } from './HallModel'
import type { HallParameters, CalculationResults, CladdingParameters, Opening, OpeningType, SkylightParameters } from '../types'

interface SceneProps {
  params: HallParameters;
  results: CalculationResults;
  cladding?: CladdingParameters;
  showCladding?: boolean;
  openings?: Opening[];
  placementMode?: boolean;
  onPlaceOpening?: (opening: Opening) => void;
  selectedOpeningType?: OpeningType;
  openingWidth?: number;
  openingHeight?: number;
  sillHeight?: number;
  skylight?: SkylightParameters;
}

function TreeBillboard({ position, scale, texture }: { position: [number, number, number]; scale: number; texture: THREE.Texture }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Always face camera (billboard effect)
  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.lookAt(camera.position);
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <planeGeometry args={[scale * 0.7, scale]} />
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.5}
        side={THREE.DoubleSide}
        roughness={0.8}
      />
    </mesh>
  );
}

function SceneContent({ params, results, cladding, showCladding, openings, placementMode, onPlaceOpening, selectedOpeningType, openingWidth, openingHeight, sillHeight, skylight }: SceneProps) {
  // Load textures
  const grassDiffuse = useLoader(THREE.TextureLoader, '/textures/grass_diff.jpg');
  const grassNormal = useLoader(THREE.TextureLoader, '/textures/grass_nor.jpg');
  const treeTexture = useLoader(THREE.TextureLoader, '/textures/tree.png');

  // Configure grass texture repeat
  useMemo(() => {
    grassDiffuse.wrapS = grassDiffuse.wrapT = THREE.RepeatWrapping;
    grassDiffuse.repeat.set(40, 40);
    grassNormal.wrapS = grassNormal.wrapT = THREE.RepeatWrapping;
    grassNormal.repeat.set(40, 40);
  }, [grassDiffuse, grassNormal]);

  // Tree billboard positions (15 trees at various distances)
  const treePositions = useMemo(() => {
    const positions: Array<[number, number, number, number]> = []; // x, y, z, scale
    const rng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    };
    const rand = rng(12345);
    for (let i = 0; i < 15; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 40 + rand() * 60;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const scale = 8 + rand() * 6; // trees 8-14m tall
      positions.push([x, scale / 2, z, scale]);
    }
    return positions;
  }, []);

  return (
    <>
      {/* HDRI Environment for realistic lighting and reflections */}
      <Environment files="/textures/meadow.hdr" background />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#87ceeb', '#3d5c2e', 0.4]} />
      <directionalLight
        position={[30, 50, 20]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={150}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />

      {/* Ground plane with grass texture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial
          map={grassDiffuse}
          normalMap={grassNormal}
          roughness={0.9}
          metalness={0}
          color="#5a8a4a"
        />
      </mesh>

      {/* Tree billboards */}
      {treePositions.map(([x, y, z, scale], i) => (
        <TreeBillboard key={i} position={[x, y, z]} scale={scale} texture={treeTexture} />
      ))}

      {/* 3D Hall Model */}
      <HallModel
        params={params}
        results={results}
        cladding={cladding}
        showCladding={showCladding}
        openings={openings}
        placementMode={placementMode}
        onPlaceOpening={onPlaceOpening}
        selectedOpeningType={selectedOpeningType}
        openingWidth={openingWidth}
        openingHeight={openingHeight}
        sillHeight={sillHeight}
        skylight={skylight}
      />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2.1}
        zoomToCursor={true}
      />
    </>
  )
}

export function Scene({ params, results, cladding, showCladding, openings, placementMode, onPlaceOpening, selectedOpeningType, openingWidth, openingHeight, sillHeight, skylight }: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [25, 15, 25], fov: 50 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      className="w-full h-full"
    >
      <SceneContent
        params={params}
        results={results}
        cladding={cladding}
        showCladding={showCladding}
        openings={openings}
        placementMode={placementMode}
        onPlaceOpening={onPlaceOpening}
        selectedOpeningType={selectedOpeningType}
        openingWidth={openingWidth}
        openingHeight={openingHeight}
        sillHeight={sillHeight}
        skylight={skylight}
      />
    </Canvas>
  )
}

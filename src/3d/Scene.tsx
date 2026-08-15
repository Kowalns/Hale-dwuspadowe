import { useMemo } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
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

function SceneContent(props: SceneProps) {
  const { params, results, ...rest } = props;

  // Load grass textures
  const grassDiffuse = useLoader(THREE.TextureLoader, '/textures/grass_diff.jpg');
  const grassNormal = useLoader(THREE.TextureLoader, '/textures/grass_nor.jpg');

  // Configure grass texture repeat
  useMemo(() => {
    grassDiffuse.wrapS = grassDiffuse.wrapT = THREE.RepeatWrapping;
    grassDiffuse.repeat.set(60, 60);
    grassNormal.wrapS = grassNormal.wrapT = THREE.RepeatWrapping;
    grassNormal.repeat.set(60, 60);
  }, [grassDiffuse, grassNormal]);

  return (
    <>
      {/* HDRI Environment — full 360° background with trees, sky, lighting */}
      <Environment files="/textures/meadow.hdr" background backgroundBlurriness={0} />

      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <hemisphereLight args={['#b1e1ff', '#3d5c2e', 0.5]} />
      <directionalLight
        position={[40, 60, 30]}
        intensity={2.0}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0001}
      />

      {/* Ground plane with real grass texture — catches shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial
          map={grassDiffuse}
          normalMap={grassNormal}
          normalScale={new THREE.Vector2(0.5, 0.5)}
          roughness={0.95}
          metalness={0}
        />
      </mesh>

      {/* 3D Hall Model */}
      <HallModel params={params} results={results} {...rest} />

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

export function Scene(props: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [30, 12, 30], fov: 45 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.8,
      }}
      className="w-full h-full"
    >
      <SceneContent {...props} />
    </Canvas>
  )
}

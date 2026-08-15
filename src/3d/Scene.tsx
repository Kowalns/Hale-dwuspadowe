import { useMemo, Suspense } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { EffectComposer, N8AO, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
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

  const grassDiffuse = useLoader(THREE.TextureLoader, '/textures/grass_diff.jpg');
  const grassNormal = useLoader(THREE.TextureLoader, '/textures/grass_nor.jpg');

  useMemo(() => {
    grassDiffuse.wrapS = grassDiffuse.wrapT = THREE.RepeatWrapping;
    grassDiffuse.repeat.set(80, 80);
    grassDiffuse.anisotropy = 16;
    grassNormal.wrapS = grassNormal.wrapT = THREE.RepeatWrapping;
    grassNormal.repeat.set(80, 80);
    grassNormal.anisotropy = 16;
  }, [grassDiffuse, grassNormal]);

  return (
    <>
      {/* 4K HDRI Environment */}
      <Environment files="/textures/meadow.hdr" background backgroundBlurriness={0.005} environmentIntensity={1.3} />

      {/* Key light (sun) */}
      <directionalLight
        position={[50, 80, 30]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        color="#fff5e0"
      />
      {/* Fill light */}
      <directionalLight position={[-30, 20, -20]} intensity={0.4} color="#a0c4ff" />
      {/* Ambient minimum */}
      <ambientLight intensity={0.05} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial
          map={grassDiffuse}
          normalMap={grassNormal}
          normalScale={new THREE.Vector2(0.8, 0.8)}
          roughness={0.95}
          metalness={0}
          envMapIntensity={0.3}
        />
      </mesh>

      {/* Hall Model */}
      <HallModel params={params} results={results} {...rest} />

      {/* Controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2.05}
        zoomToCursor
      />

      {/* Postprocessing */}
      <EffectComposer multisampling={4}>
        <N8AO aoRadius={0.5} intensity={3} distanceFalloff={1} />
        <Bloom intensity={0.1} luminanceThreshold={0.85} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette offset={0.3} darkness={0.5} />
        <ToneMapping mode={ToneMappingMode.AGX} />
      </EffectComposer>
    </>
  )
}

export function Scene(props: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [30, 10, 30], fov: 40 }}
      gl={{
        powerPreference: 'high-performance',
        antialias: false,
        stencil: false,
        depth: true,
      }}
      dpr={[1, 2]}
      className="w-full h-full"
    >
      <Suspense fallback={null}>
        <SceneContent {...props} />
      </Suspense>
    </Canvas>
  )
}

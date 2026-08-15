import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Sky } from '@react-three/drei'
import { HallModel } from './HallModel'
import type { HallParameters, CalculationResults, CladdingParameters, Opening, OpeningType, SkylightParameters } from '../types'

const TREE_POSITIONS: [number, number, number][] = [
  [25, 0, 25],
  [-20, 0, 30],
  [30, 0, -15],
  [-25, 0, -20],
  [35, 0, 10],
]

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 3, 8]} />
        <meshStandardMaterial color="#5c3d1e" />
      </mesh>
      {/* Canopy */}
      <mesh position={[0, 4, 0]} castShadow>
        <sphereGeometry args={[1.5, 12, 12]} />
        <meshStandardMaterial color="#2d6b30" />
      </mesh>
    </group>
  )
}

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

function SceneContent({ params, results, cladding, showCladding, openings, placementMode, onPlaceOpening, selectedOpeningType, openingWidth, openingHeight, sillHeight, skylight }: SceneProps) {
  return (
    <>
      {/* Sky */}
      <Sky sunPosition={[100, 50, 100]} />

      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />

      {/* Ground plane */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#4a7c3f" />
      </mesh>

      {/* Grid helper */}
      <Grid
        position={[0, 0, 0]}
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#cbd5e1"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#94a3b8"
        fadeDistance={50}
        infiniteGrid
      />

      {/* Trees */}
      {TREE_POSITIONS.map((pos, i) => (
        <Tree key={i} position={pos} />
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
      camera={{ position: [20, 15, 20], fov: 50 }}
      gl={{ antialias: true }}
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

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { HallModel } from './HallModel'
import type { HallParameters, CalculationResults, CladdingParameters, Opening, OpeningType } from '../types'

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
}

function SceneContent({ params, results, cladding, showCladding, openings, placementMode, onPlaceOpening, selectedOpeningType, openingWidth, openingHeight, sillHeight }: SceneProps) {
  return (
    <>
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

export function Scene({ params, results, cladding, showCladding, openings, placementMode, onPlaceOpening, selectedOpeningType, openingWidth, openingHeight, sillHeight }: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [20, 15, 20], fov: 50 }}
      gl={{ antialias: true }}
      className="w-full h-full"
    >
      <color attach="background" args={['#f0f4f8']} />
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
      />
    </Canvas>
  )
}

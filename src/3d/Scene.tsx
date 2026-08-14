import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'

function SceneContent() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
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
        cellColor="#0f3460"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#16213e"
        fadeDistance={50}
        infiniteGrid
      />

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={100}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}

export function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [20, 15, 20], fov: 50 }}
      gl={{ antialias: true }}
      className="w-full h-full"
    >
      <SceneContent />
    </Canvas>
  )
}

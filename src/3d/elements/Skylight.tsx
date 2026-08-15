import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SkylightParameters } from '../../types';

interface SkylightProps {
  skylight: SkylightParameters;
  hallLength: number;
  ridgeHeight: number;
  span: number;
}

/**
 * Ridge skylight - semi-cylindrical arched translucent element
 * positioned on the ridge line, centered along the hall length.
 * Uses CylinderGeometry with thetaLength=PI for half-cylinder arch.
 */
export const Skylight = React.memo(function Skylight({
  skylight,
  hallLength,
  ridgeHeight,
  span,
}: SkylightProps) {
  const { length: skylightLength, width: skylightWidth } = skylight;

  // Arch radius = half of width (across the ridge)
  const radius = skylightWidth / 2;
  // Arch height proportional to width
  const archHeight = skylightWidth / 3;

  const material = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#b0d4f1'),
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      roughness: 0.1,
      metalness: 0.0,
      depthWrite: false,
    });
  }, []);

  // Create a half-cylinder geometry for the arched skylight
  // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)
  // The cylinder axis is along Y by default; we want the arch axis along X (the hall length)
  // So we create it with height=skylightLength (which maps to its Y axis), then rotate it
  const geometry = useMemo(() => {
    // Use a custom approach: scale a half-cylinder to get the desired arch height
    // Standard half-cylinder: radius for circular cross-section
    // We want width = skylightWidth across Z, height = archHeight above ridge
    const segments = 32;
    const geo = new THREE.CylinderGeometry(
      radius,
      radius,
      skylightLength,
      segments,
      1,
      true, // open-ended
      0,
      Math.PI
    );
    // Scale Y to achieve desired arch height (ratio of archHeight to radius)
    const scaleY = archHeight / radius;
    geo.scale(1, scaleY, 1);
    return geo;
  }, [radius, skylightLength, archHeight]);

  // Position: centered on the ridge
  // Ridge is at Y=ridgeHeight, Z=span/2, centered along X (at hallLength/2)
  // The cylinder's axis is along Y by default; we need it along X
  // Rotate -90 degrees around Z to align cylinder axis with X
  const posX = hallLength / 2;
  const posY = ridgeHeight;
  const posZ = span / 2;

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[posX, posY, posZ]}
      rotation={[0, 0, Math.PI / 2]}
    />
  );
});

import * as THREE from 'three';

/**
 * Steel materials with slightly different shades for different element types.
 * All use MeshStandardMaterial with metallic appearance.
 */

// Columns - medium steel gray
export const columnMaterial = new THREE.MeshStandardMaterial({
  color: 0x6b7280,
  metalness: 0.8,
  roughness: 0.4,
});

// Rafters and Trusses - slightly lighter gray
export const rafterMaterial = new THREE.MeshStandardMaterial({
  color: 0x9ca3af,
  metalness: 0.8,
  roughness: 0.35,
});

// Purlins - blue-gray
export const purlinMaterial = new THREE.MeshStandardMaterial({
  color: 0x7b8fa3,
  metalness: 0.75,
  roughness: 0.45,
});

// Bracing - dark gray
export const bracingMaterial = new THREE.MeshStandardMaterial({
  color: 0x4b5563,
  metalness: 0.85,
  roughness: 0.3,
});

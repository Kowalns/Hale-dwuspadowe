export interface CladdingProduct {
  id: string;
  name: string;
  manufacturer: string;
  type: 'trapezoid' | 'sandwich_wall' | 'sandwich_roof';
  profileHeight: number; // mm (amplitude of the trapezoidal wave)
  waveSpacing: number; // mm (period of the wave)
  thickness: number; // mm (steel sheet thickness)
  panelWidth: number; // mm (effective coverage width)
  weight: number; // kg/m2
  thermalU?: number; // W/(m2*K) for sandwich panels
  coreThickness?: number; // mm for sandwich panels
}

export const claddingProducts: CladdingProduct[] = [
  // Trapezoidal sheets - walls
  {
    id: 'T18-pruszynski',
    name: 'T18 Pruszynski',
    manufacturer: 'Pruszynski',
    type: 'trapezoid',
    profileHeight: 18,
    waveSpacing: 100,
    thickness: 0.5,
    panelWidth: 1100,
    weight: 4.5,
  },
  {
    id: 'T35-pruszynski',
    name: 'T35 Pruszynski',
    manufacturer: 'Pruszynski',
    type: 'trapezoid',
    profileHeight: 35,
    waveSpacing: 150,
    thickness: 0.7,
    panelWidth: 1060,
    weight: 6.2,
  },
  {
    id: 'T18-blachotrapez',
    name: 'T18 Blachotrapez',
    manufacturer: 'Blachotrapez',
    type: 'trapezoid',
    profileHeight: 18,
    waveSpacing: 100,
    thickness: 0.5,
    panelWidth: 1100,
    weight: 4.5,
  },
  {
    id: 'T35-blachotrapez',
    name: 'T35 Blachotrapez',
    manufacturer: 'Blachotrapez',
    type: 'trapezoid',
    profileHeight: 35,
    waveSpacing: 150,
    thickness: 0.7,
    panelWidth: 1060,
    weight: 6.2,
  },
  // Sandwich panels - walls
  {
    id: 'sandwich-wall-europanels',
    name: 'Panel scienny Europanels',
    manufacturer: 'Europanels',
    type: 'sandwich_wall',
    profileHeight: 0,
    waveSpacing: 0,
    thickness: 0.5,
    panelWidth: 1000,
    weight: 11.5,
    thermalU: 0.2,
    coreThickness: 100,
  },
  {
    id: 'sandwich-wall-paneltech',
    name: 'Panel scienny Paneltech',
    manufacturer: 'Paneltech',
    type: 'sandwich_wall',
    profileHeight: 0,
    waveSpacing: 0,
    thickness: 0.5,
    panelWidth: 1000,
    weight: 11.8,
    thermalU: 0.2,
    coreThickness: 100,
  },
  // Sandwich panels - roof
  {
    id: 'sandwich-roof-europanels',
    name: 'Plyta dachowa Europanels',
    manufacturer: 'Europanels',
    type: 'sandwich_roof',
    profileHeight: 0,
    waveSpacing: 0,
    thickness: 0.5,
    panelWidth: 1000,
    weight: 12.0,
    thermalU: 0.18,
    coreThickness: 120,
  },
  {
    id: 'sandwich-roof-paneltech',
    name: 'Plyta dachowa Paneltech',
    manufacturer: 'Paneltech',
    type: 'sandwich_roof',
    profileHeight: 0,
    waveSpacing: 0,
    thickness: 0.5,
    panelWidth: 1000,
    weight: 12.2,
    thermalU: 0.18,
    coreThickness: 120,
  },
];

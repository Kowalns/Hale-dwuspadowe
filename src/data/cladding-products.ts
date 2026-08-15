export interface CladdingProduct {
  id: string;
  name: string;
  manufacturer: string;
  type: 'trapezowa' | 'sandwich_wall' | 'sandwich_roof';
  coverageWidth: number; // mm - szerokość krycia
  profileHeight: number; // mm - wys. przetłoczenia (0 for sandwich)
  waveSpacing: number; // mm - rozstaw fal/przetłoczeń
}

export const claddingProducts: CladdingProduct[] = [
  // Blachy trapezowe
  { id: 't18-pruszynski', name: 'T18', manufacturer: 'Pruszyński', type: 'trapezowa', coverageWidth: 1064, profileHeight: 18, waveSpacing: 100 },
  { id: 't35-pruszynski', name: 'T35', manufacturer: 'Pruszyński', type: 'trapezowa', coverageWidth: 1050, profileHeight: 35, waveSpacing: 150 },
  { id: 't18-blachotrapez', name: 'T18', manufacturer: 'Blachotrapez', type: 'trapezowa', coverageWidth: 1060, profileHeight: 18, waveSpacing: 100 },
  { id: 't35-blachotrapez', name: 'T35', manufacturer: 'Blachotrapez', type: 'trapezowa', coverageWidth: 1045, profileHeight: 35, waveSpacing: 150 },
  // Płyty warstwowe ścienne
  { id: 'sandwich-europanels-100', name: 'Płyta ścienna PU 100mm', manufacturer: 'Europanels', type: 'sandwich_wall', coverageWidth: 1000, profileHeight: 0, waveSpacing: 0 },
  { id: 'sandwich-paneltech-100', name: 'KS1000 AWP 100mm', manufacturer: 'Paneltech', type: 'sandwich_wall', coverageWidth: 1000, profileHeight: 0, waveSpacing: 0 },
  // Płyty warstwowe dachowe
  { id: 'sandwich-roof-europanels', name: 'Płyta dachowa PU 100mm', manufacturer: 'Europanels', type: 'sandwich_roof', coverageWidth: 1000, profileHeight: 0, waveSpacing: 0 },
  { id: 'sandwich-roof-paneltech', name: 'KS1000 RW 100mm', manufacturer: 'Paneltech', type: 'sandwich_roof', coverageWidth: 1000, profileHeight: 0, waveSpacing: 0 },
];

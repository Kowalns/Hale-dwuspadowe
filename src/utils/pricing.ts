import type { PricingData } from '../data/pricing';
import type { HallParameters, CalculationResults, CladdingParameters, Opening, SkylightParameters } from '../types';
import { calculateRoofSlopeLength } from './geometry';

export interface PricingCategory {
  name: string; // i18n key
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface PricingResult {
  categories: PricingCategory[];
  totalNet: number;
  vat: number;
  totalGross: number;
  costPerM2: number;
  steelMassPerM2: number;
  categoryPercentages: { name: string; percent: number; total: number }[];
}

export interface PricingInput {
  params: HallParameters;
  results: CalculationResults;
  cladding: CladdingParameters;
  openings: Opening[];
  skylight: SkylightParameters;
  pricing: PricingData;
}

/**
 * Compute purlin mass based on purlin profile, spacing, and roof geometry.
 */
function computePurlinMass(input: PricingInput): number {
  const { params, results } = input;
  const roofSlopeLength = calculateRoofSlopeLength(params.span, params.roofAngle);
  const purlinSpacing = results.purlinSpacing;
  const purlinMassPerM = results.purlinProfile.mass;

  // Number of purlins per slope = floor(roofSlopeLength / purlinSpacing) + 1
  // But the ridge and eave purlins exist on each slope
  const numPurlinsPerSlope = Math.round(roofSlopeLength / purlinSpacing) + 1;
  const totalPurlins = numPurlinsPerSlope * 2; // two slopes
  // Each purlin spans the full hall length
  const purlinMass = totalPurlins * params.length * purlinMassPerM;
  return purlinMass;
}

/**
 * Compute total opening area for wall type.
 */
function computeOpeningAreas(openings: Opening[]): number {
  return openings.reduce((sum, o) => sum + o.width * o.height, 0);
}

/**
 * Calculate flashing total area per specification.
 */
function computeFlashingArea(input: PricingInput): number {
  const { params, openings } = input;
  const hallLength = params.length;
  const wallHeight = params.wallHeight;
  const span = params.span;
  const perimeter = 2 * (hallLength + span);

  // Ridge: 0.3m development * hallLength
  const ridge = 0.3 * hallLength;

  // Eave: 0.25m * 2 * hallLength (both eaves)
  const eave = 0.25 * 2 * hallLength;

  // Corner vertical: 0.2m * wallHeight * 4 corners
  const cornerVertical = 0.2 * wallHeight * 4;

  // Plinth: 0.2m * perimeter
  const plinth = 0.2 * perimeter;

  // Window sill: 0.2m * window_width * window_count
  const windows = openings.filter((o) => o.type === 'window');
  const windowSill = 0.2 * windows.reduce((sum, w) => sum + w.width, 0);

  // Jamb (door/window frame flashings): 0.15m * opening_perimeter * opening_count
  const jambArea = openings.reduce((sum, o) => {
    const openingPerimeter = 2 * (o.width + o.height);
    return sum + 0.15 * openingPerimeter;
  }, 0);

  // Wall-roof junction: 0.25m * 2 * hallLength
  const wallRoofJunction = 0.25 * 2 * hallLength;

  return ridge + eave + cornerVertical + plinth + windowSill + jambArea + wallRoofJunction;
}

/**
 * Main pricing calculation function.
 */
export function calculatePricing(input: PricingInput): PricingResult {
  const { params, results, cladding, openings, skylight, pricing } = input;

  const hallLength = params.length;
  const wallHeight = params.wallHeight;
  const span = params.span;
  const roofAngleRad = (params.roofAngle * Math.PI) / 180;
  const roofSlopeLength = calculateRoofSlopeLength(span, params.roofAngle);
  const gableTriangleHeight = (span / 2) * Math.tan(roofAngleRad);
  const floorArea = span * hallLength;

  // --- Steel cost ---
  const purlinMass = computePurlinMass(input);
  const mainSteelMass = Math.max(0, results.totalSteelMass - purlinMass);
  const steelCost = mainSteelMass * pricing.steelMain + purlinMass * pricing.steelPurlins;
  const totalSteelQty = results.totalSteelMass; // kg

  // --- Cladding cost ---
  // Wall areas
  const sideWallArea = 2 * hallLength * wallHeight;
  const endWallArea = 2 * (span * wallHeight + (span * gableTriangleHeight) / 2);
  const totalOpeningArea = computeOpeningAreas(openings);
  const netWallArea = Math.max(0, sideWallArea + endWallArea - totalOpeningArea);

  // Roof area
  const roofArea = 2 * hallLength * roofSlopeLength;

  // Wall price depends on cladding type (use highest-cost type as approximation,
  // or we could split by side/end wall types)
  const sideWallPrice = cladding.sideWallType === 'sandwich' ? pricing.sandwichWall : pricing.sheetT35;
  const endWallPrice = cladding.endWallType === 'sandwich' ? pricing.sandwichWall : pricing.sheetT35;
  const netSideWallArea = Math.max(0, sideWallArea - openings
    .filter((o) => o.wall === 'side_left' || o.wall === 'side_right')
    .reduce((sum, o) => sum + o.width * o.height, 0));
  const netEndWallArea = Math.max(0, endWallArea - openings
    .filter((o) => o.wall === 'end_front' || o.wall === 'end_back')
    .reduce((sum, o) => sum + o.width * o.height, 0));

  const wallCladdingCost = netSideWallArea * sideWallPrice + netEndWallArea * endWallPrice;

  // Roof price depends on roof type
  let roofPrice: number;
  switch (cladding.roofType) {
    case 'T18':
      roofPrice = pricing.sheetT18;
      break;
    case 'T35':
      roofPrice = pricing.sheetT35;
      break;
    case 'sandwich_roof':
      roofPrice = pricing.sandwichRoof;
      break;
  }
  const roofCladdingCost = roofArea * roofPrice;
  const totalCladdingCost = wallCladdingCost + roofCladdingCost;
  const totalCladdingArea = netWallArea + roofArea;

  // --- Openings cost ---
  let openingsCost = 0;
  for (const o of openings) {
    const area = o.width * o.height;
    switch (o.type) {
      case 'sliding_gate':
        openingsCost += area * pricing.gateSlidingPerSqm;
        break;
      case 'sectional_gate':
        openingsCost += area * pricing.gateSectionalPerSqm;
        break;
      case 'door':
        openingsCost += pricing.doorPerPiece;
        break;
      case 'window':
        openingsCost += area * pricing.windowPerSqm;
        break;
    }
  }

  // --- Skylight cost ---
  const skylightCost = skylight.enabled ? skylight.length * pricing.skylightPerM : 0;
  const skylightQty = skylight.enabled ? skylight.length : 0;

  // --- Flashings cost ---
  const flashingArea = computeFlashingArea(input);
  const flashingsCost = flashingArea * pricing.flashingsPerSqm;

  // --- Gutters cost ---
  const gutterLength = 2 * hallLength;
  const guttersCost = gutterLength * pricing.gutterPerM;

  // --- Installation cost ---
  const installationCost = pricing.installDays * pricing.installDayRate;

  // --- Build categories ---
  const categories: PricingCategory[] = [
    {
      name: 'pricing.categories.steel',
      quantity: Math.round(totalSteelQty),
      unit: 'kg',
      unitPrice: totalSteelQty > 0 ? Math.round((steelCost / totalSteelQty) * 100) / 100 : pricing.steelMain,
      total: steelCost,
    },
    {
      name: 'pricing.categories.cladding',
      quantity: Math.round(totalCladdingArea * 100) / 100,
      unit: 'm\u00B2',
      unitPrice: Math.round((totalCladdingCost / Math.max(1, totalCladdingArea)) * 100) / 100,
      total: totalCladdingCost,
    },
    {
      name: 'pricing.categories.openings',
      quantity: openings.length,
      unit: 'szt.',
      unitPrice: openings.length > 0 ? Math.round(openingsCost / openings.length) : 0,
      total: openingsCost,
    },
    {
      name: 'pricing.categories.skylights',
      quantity: Math.round(skylightQty * 100) / 100,
      unit: 'm',
      unitPrice: pricing.skylightPerM,
      total: skylightCost,
    },
    {
      name: 'pricing.categories.flashings',
      quantity: Math.round(flashingArea * 100) / 100,
      unit: 'm\u00B2',
      unitPrice: pricing.flashingsPerSqm,
      total: flashingsCost,
    },
    {
      name: 'pricing.categories.gutters',
      quantity: Math.round(gutterLength * 100) / 100,
      unit: 'm',
      unitPrice: pricing.gutterPerM,
      total: guttersCost,
    },
    {
      name: 'pricing.categories.installation',
      quantity: pricing.installDays,
      unit: 'dni',
      unitPrice: pricing.installDayRate,
      total: installationCost,
    },
  ];

  const totalNet = categories.reduce((sum, c) => sum + c.total, 0);
  const vat = totalNet * 0.23;
  const totalGross = totalNet + vat;
  const costPerM2 = floorArea > 0 ? totalNet / floorArea : 0;
  const steelMassPerM2 = results.steelMassPerM2;

  // Category percentages for bar chart
  const categoryPercentages = categories.map((c) => ({
    name: c.name,
    percent: totalNet > 0 ? (c.total / totalNet) * 100 : 0,
    total: c.total,
  }));

  return {
    categories,
    totalNet,
    vat,
    totalGross,
    costPerM2,
    steelMassPerM2,
    categoryPercentages,
  };
}

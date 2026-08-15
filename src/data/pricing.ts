export interface PricingData {
  steelMain: number; // PLN/kg - main steel (columns, rafters, trusses)
  steelPurlins: number; // PLN/kg - purlins
  sheetT18: number; // PLN/m2 - trapezoidal sheet T18
  sheetT35: number; // PLN/m2 - trapezoidal sheet T35
  sandwichRoof: number; // PLN/m2 - sandwich panel roof
  sandwichWall: number; // PLN/m2 - sandwich panel wall
  gateSlidingPerSqm: number; // PLN/m2
  gateSectionalPerSqm: number; // PLN/m2
  doorPerPiece: number; // PLN/piece
  windowPerSqm: number; // PLN/m2
  skylightPerM: number; // PLN/running meter
  gutterPerM: number; // PLN/running meter
  foundationPad: number; // PLN/piece
  foundationStrip: number; // PLN/running meter
  floorSlab: number; // PLN/m2
  flashingsPerSqm: number; // PLN/m2 of developed flashing area
  installDayRate: number; // PLN/day
  installDays: number; // number of days
}

export const defaultPricing: PricingData = {
  steelMain: 11.00,
  steelPurlins: 9.50,
  sheetT18: 35.00,
  sheetT35: 45.00,
  sandwichRoof: 120.00,
  sandwichWall: 110.00,
  gateSlidingPerSqm: 500,
  gateSectionalPerSqm: 450,
  doorPerPiece: 1500,
  windowPerSqm: 800,
  skylightPerM: 250,
  gutterPerM: 85,
  foundationPad: 2500,
  foundationStrip: 350,
  floorSlab: 120,
  flashingsPerSqm: 65,
  installDayRate: 2500,
  installDays: 14,
};

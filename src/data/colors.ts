export interface RALColor {
  code: string;
  hex: string;
  name: {
    pl: string;
    en: string;
  };
}

export const RAL_COLORS: RALColor[] = [
  { code: 'RAL 9002', hex: '#e3dfd3', name: { pl: 'Bialy szary', en: 'Grey white' } },
  { code: 'RAL 9006', hex: '#a5a5a0', name: { pl: 'Srebrny', en: 'White aluminium' } },
  { code: 'RAL 9007', hex: '#878681', name: { pl: 'Aluminiowy', en: 'Grey aluminium' } },
  { code: 'RAL 7016', hex: '#293133', name: { pl: 'Antracyt', en: 'Anthracite grey' } },
  { code: 'RAL 7035', hex: '#c5c7c4', name: { pl: 'Jasnoszary', en: 'Light grey' } },
  { code: 'RAL 7040', hex: '#9da1a4', name: { pl: 'Szary', en: 'Window grey' } },
  { code: 'RAL 5010', hex: '#004f7c', name: { pl: 'Niebieski', en: 'Gentian blue' } },
  { code: 'RAL 6005', hex: '#0f4336', name: { pl: 'Zielony', en: 'Moss green' } },
  { code: 'RAL 3000', hex: '#a72920', name: { pl: 'Czerwony', en: 'Flame red' } },
  { code: 'RAL 8017', hex: '#3f2a23', name: { pl: 'Brazowy', en: 'Chocolate brown' } },
  { code: 'RAL 1015', hex: '#e6d2a8', name: { pl: 'Kremowy', en: 'Light ivory' } },
  { code: 'RAL 2004', hex: '#e25303', name: { pl: 'Pomaranczowy', en: 'Pure orange' } },
];

export function getRALHex(code: string): string {
  const color = RAL_COLORS.find((c) => c.code === code);
  return color?.hex ?? '#e3dfd3';
}

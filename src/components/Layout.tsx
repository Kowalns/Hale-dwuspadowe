import { useState } from 'react';
import { FormPanel, DEFAULT_PARAMS } from './FormPanel';
import { Scene } from '../3d/Scene';
import { useHallCalculations } from '../hooks/useHallCalculations';
import type { HallParameters, ProfileOverrides, RafterType, CladdingParameters } from '../types';

export const DEFAULT_CLADDING: CladdingParameters = {
  sideWallType: 'sandwich',
  endWallType: 'sandwich',
  roofType: 'T35',
  sideWallColor: 'RAL 9002',
  endWallColor: 'RAL 9002',
  roofColor: 'RAL 9002',
  flashingColor: 'RAL 9002',
  panelOrientation: 'horizontal',
  panelWidth: 1000,
  colorStripes: [],
};

export function Layout() {
  const [params, setParams] = useState<HallParameters>(DEFAULT_PARAMS);
  const [profileOverrides, setProfileOverrides] = useState<ProfileOverrides>({});
  const [rafterType, setRafterType] = useState<RafterType>('auto');
  const [customTrussHeight, setCustomTrussHeight] = useState<number | null>(null);
  const [cladding, setCladding] = useState<CladdingParameters>(DEFAULT_CLADDING);
  const [showCladding, setShowCladding] = useState(true);

  const results = useHallCalculations(params, profileOverrides, rafterType, customTrussHeight);

  return (
    <main className="flex flex-col md:flex-row flex-1 overflow-hidden">
      {/* Left panel - Form ~35% */}
      <aside className="w-full md:w-[35%] h-[40vh] md:h-auto bg-surface-primary border-b md:border-b-0 md:border-r border-border overflow-hidden">
        <FormPanel
          params={params}
          onParamsChange={setParams}
          results={results}
          profileOverrides={profileOverrides}
          onProfileOverridesChange={setProfileOverrides}
          rafterType={rafterType}
          onRafterTypeChange={setRafterType}
          customTrussHeight={customTrussHeight}
          onCustomTrussHeightChange={setCustomTrussHeight}
          cladding={cladding}
          onCladdingChange={setCladding}
          showCladding={showCladding}
          onShowCladdingChange={setShowCladding}
        />
      </aside>
      {/* Right panel - 3D Canvas ~65% */}
      <section className="w-full md:w-[65%] flex-1 bg-surface-secondary relative">
        <Scene
          params={params}
          results={results}
          cladding={cladding}
          showCladding={showCladding}
        />
      </section>
    </main>
  );
}

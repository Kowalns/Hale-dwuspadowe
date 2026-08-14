import { useState } from 'react';
import { FormPanel, DEFAULT_PARAMS } from './FormPanel';
import { Scene } from '../3d/Scene';
import { useHallCalculations } from '../hooks/useHallCalculations';
import type { HallParameters, ProfileOverrides, RafterType } from '../types';

export function Layout() {
  const [params, setParams] = useState<HallParameters>(DEFAULT_PARAMS);
  const [profileOverrides, setProfileOverrides] = useState<ProfileOverrides>({});
  const [rafterType, setRafterType] = useState<RafterType>('auto');
  const [customTrussHeight, setCustomTrussHeight] = useState<number | null>(null);

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
        />
      </aside>
      {/* Right panel - 3D Canvas ~65% */}
      <section className="w-full md:w-[65%] flex-1 bg-surface-secondary relative">
        <Scene params={params} results={results} />
      </section>
    </main>
  );
}

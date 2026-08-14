import { useState, useCallback } from 'react';
import { FormPanel, DEFAULT_PARAMS } from './FormPanel';
import { Scene } from '../3d/Scene';
import { ViewPresets } from './ViewPresets';
import { useHallCalculations } from '../hooks/useHallCalculations';
import type { HallParameters } from '../types';
import type { ViewPreset } from './ViewPresets';

export function Layout() {
  const [params, setParams] = useState<HallParameters>(DEFAULT_PARAMS);
  const results = useHallCalculations(params);
  const [viewPreset, setViewPreset] = useState<ViewPreset | null>(null);

  const handleViewPresetApplied = useCallback(() => {
    setViewPreset(null);
  }, []);

  return (
    <main className="flex flex-col md:flex-row flex-1 overflow-hidden">
      {/* Left panel - Form ~35% */}
      <aside className="w-full md:w-[35%] h-[40vh] md:h-auto bg-dark-secondary border-b md:border-b-0 md:border-r border-dark-tertiary overflow-hidden">
        <FormPanel params={params} onParamsChange={setParams} results={results} />
      </aside>
      {/* Right panel - 3D Canvas ~65% */}
      <section className="w-full md:w-[65%] flex-1 bg-dark-primary relative">
        <ViewPresets
          onSelectView={setViewPreset}
          hallLength={params.length}
          hallSpan={params.span}
          ridgeHeight={results.ridgeHeight}
        />
        <Scene
          params={params}
          results={results}
          viewPreset={viewPreset}
          onViewPresetApplied={handleViewPresetApplied}
        />
      </section>
    </main>
  );
}

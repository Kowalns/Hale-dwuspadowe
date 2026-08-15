import { useTranslation } from 'react-i18next';
import type { SkylightParameters } from '../types';

interface SkylightPanelProps {
  skylight: SkylightParameters;
  onSkylightChange: (skylight: SkylightParameters) => void;
  hallLength: number;
}

export function SkylightPanel({ skylight, onSkylightChange, hallLength }: SkylightPanelProps) {
  const { t } = useTranslation();

  const update = <K extends keyof SkylightParameters>(key: K, value: SkylightParameters[K]) => {
    onSkylightChange({ ...skylight, [key]: value });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-sans font-bold text-text-primary uppercase tracking-wider border-b border-border pb-1">
        {t('skylight.title')}
      </h3>

      {/* Enable toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={skylight.enabled}
          onChange={(e) => update('enabled', e.target.checked)}
          className="accent-accent-blue"
        />
        <span className="text-xs font-sans text-text-secondary">
          {t('skylight.enable')}
        </span>
      </label>

      {skylight.enabled && (
        <>
          {/* Length slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs text-text-secondary font-sans">{t('skylight.length')}</label>
              <span className="text-xs text-accent-blue font-sans font-bold">
                {skylight.length} m
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={1}
                max={hallLength}
                step={0.5}
                value={skylight.length}
                onChange={(e) => update('length', Number(e.target.value))}
                className="flex-1 h-1.5 bg-surface-tertiary rounded-lg appearance-none cursor-pointer accent-accent-blue"
              />
              <input
                type="number"
                min={1}
                max={hallLength}
                step={0.5}
                value={skylight.length}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 1 && v <= hallLength) update('length', v);
                }}
                className="w-16 px-1.5 py-0.5 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
              />
            </div>
          </div>

          {/* Width slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs text-text-secondary font-sans">{t('skylight.width')}</label>
              <span className="text-xs text-accent-blue font-sans font-bold">
                {skylight.width} m
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.1}
                value={skylight.width}
                onChange={(e) => update('width', Number(e.target.value))}
                className="flex-1 h-1.5 bg-surface-tertiary rounded-lg appearance-none cursor-pointer accent-accent-blue"
              />
              <input
                type="number"
                min={0.5}
                max={3.0}
                step={0.1}
                value={skylight.width}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 0.5 && v <= 3.0) update('width', v);
                }}
                className="w-16 px-1.5 py-0.5 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

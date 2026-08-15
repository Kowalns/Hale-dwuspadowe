import { useTranslation } from 'react-i18next';
import type { Opening, OpeningType } from '../types';

interface OpeningsPanelProps {
  openings: Opening[];
  onRemoveOpening: (id: string) => void;
  placementMode: boolean;
  onPlacementModeChange: (mode: boolean) => void;
  selectedOpeningType: OpeningType;
  onSelectedOpeningTypeChange: (type: OpeningType) => void;
  openingWidth: number;
  onOpeningWidthChange: (w: number) => void;
  openingHeight: number;
  onOpeningHeightChange: (h: number) => void;
  sillHeight: number;
  onSillHeightChange: (h: number) => void;
}

const OPENING_TYPES: OpeningType[] = ['sliding_gate', 'sectional_gate', 'door', 'window'];

interface Preset {
  label: string;
  width: number;
  height: number;
}

const GATE_PRESETS: Preset[] = [
  { label: '4 x 4 m', width: 4, height: 4 },
  { label: '5 x 5 m', width: 5, height: 5 },
  { label: '3 x 3 m', width: 3, height: 3 },
  { label: '6 x 5 m', width: 6, height: 5 },
];

const DOOR_PRESETS: Preset[] = [
  { label: '0.9 x 2.0 m', width: 0.9, height: 2.0 },
  { label: '1.2 x 2.5 m', width: 1.2, height: 2.5 },
  { label: '1.0 x 2.1 m', width: 1.0, height: 2.1 },
];

export function OpeningsPanel({
  openings,
  onRemoveOpening,
  placementMode,
  onPlacementModeChange,
  selectedOpeningType,
  onSelectedOpeningTypeChange,
  openingWidth,
  onOpeningWidthChange,
  openingHeight,
  onOpeningHeightChange,
  sillHeight,
  onSillHeightChange,
}: OpeningsPanelProps) {
  const { t } = useTranslation();

  const isGateType = selectedOpeningType === 'sliding_gate' || selectedOpeningType === 'sectional_gate';
  const isDoor = selectedOpeningType === 'door';
  const isWindow = selectedOpeningType === 'window';
  const presets = isGateType ? GATE_PRESETS : isDoor ? DOOR_PRESETS : [];

  const applyPreset = (preset: Preset) => {
    onOpeningWidthChange(preset.width);
    onOpeningHeightChange(preset.height);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-sans font-bold text-text-primary uppercase tracking-wider border-b border-border pb-1">
        {t('openings.title')}
      </h3>

      {/* Placement mode toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={placementMode}
          onChange={(e) => onPlacementModeChange(e.target.checked)}
          className="accent-accent-blue"
        />
        <span className="text-xs font-sans text-text-secondary">
          {t('openings.placementMode')}
        </span>
      </label>

      {placementMode && (
        <p className="text-[10px] font-sans text-accent-blue">
          {t('openings.placementModeHint')}
        </p>
      )}

      {/* Opening type selector */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-sans">{t('openings.type')}</label>
        <select
          value={selectedOpeningType}
          onChange={(e) => onSelectedOpeningTypeChange(e.target.value as OpeningType)}
          className="w-full px-2 py-1.5 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
        >
          {OPENING_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`openings.types.${type}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Dimension presets */}
      {presets.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs text-text-secondary font-sans">{t('openings.presets')}</label>
          <div className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`text-[10px] font-sans px-2 py-0.5 rounded border transition-colors ${
                  openingWidth === p.width && openingHeight === p.height
                    ? 'border-accent-blue bg-accent-blue text-white'
                    : 'border-border text-text-secondary hover:border-accent-blue hover:text-accent-blue'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Width / Height inputs */}
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-text-secondary font-sans">{t('openings.width')}</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0.5}
              max={12}
              step={0.1}
              value={openingWidth}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.5 && v <= 12) onOpeningWidthChange(v);
              }}
              className="w-full px-2 py-1 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
            />
            <span className="text-xs text-text-secondary font-sans">m</span>
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs text-text-secondary font-sans">{t('openings.height')}</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0.5}
              max={10}
              step={0.1}
              value={openingHeight}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.5 && v <= 10) onOpeningHeightChange(v);
              }}
              className="w-full px-2 py-1 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
            />
            <span className="text-xs text-text-secondary font-sans">m</span>
          </div>
        </div>
      </div>

      {/* Sill height for windows */}
      {isWindow && (
        <div className="space-y-1">
          <label className="text-xs text-text-secondary font-sans">{t('openings.sillHeight')}</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0.3}
              max={8}
              step={0.1}
              value={sillHeight}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0.3 && v <= 8) onSillHeightChange(v);
              }}
              className="w-20 px-2 py-1 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
            />
            <span className="text-xs text-text-secondary font-sans">m</span>
          </div>
        </div>
      )}

      {/* Openings list */}
      <div className="space-y-1.5">
        <label className="text-xs text-text-secondary font-sans font-semibold">
          {t('openings.list')} ({openings.length})
        </label>
        {openings.length === 0 && (
          <p className="text-[10px] text-text-secondary font-sans italic">
            {t('openings.noOpenings')}
          </p>
        )}
        {openings.map((opening) => (
          <div
            key={opening.id}
            className="flex items-center justify-between p-1.5 border border-border rounded bg-surface-secondary"
          >
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-sans text-text-primary font-semibold block truncate">
                {t(`openings.types.${opening.type}`)}
              </span>
              <span className="text-[10px] font-sans text-text-secondary block">
                {opening.width.toFixed(1)} x {opening.height.toFixed(1)} m | {t(`openings.walls.${opening.wall}`)}
              </span>
            </div>
            <button
              onClick={() => onRemoveOpening(opening.id)}
              className="text-[10px] text-red-400 hover:text-red-600 px-1.5 py-0.5 ml-1 shrink-0"
              title={t('openings.delete')}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HallParameters, CalculationResults, CoveringType, SteelGrade, TerrainCategory, SnowExposure, ProfileOverrides, RafterType } from '../types';
import { ResultsPanel } from './ResultsPanel';

const DEFAULT_PARAMS: HallParameters = {
  span: 18,
  length: 48,
  wallHeight: 6,
  roofAngle: 10,
  steelGrade: 'S235',
  snowZone: 2,
  windZone: 1,
  coveringType: 'sandwich',
  terrainCategory: 2,
  snowExposure: 'normal',
};

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

function SliderInput({ label, value, min, max, step, unit, onChange }: SliderInputProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-xs text-text-secondary font-sans">{label}</label>
        <span className="text-xs text-accent-blue font-sans font-bold">
          {value}{unit}
        </span>
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 bg-surface-tertiary rounded-lg appearance-none cursor-pointer accent-accent-blue"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= min && v <= max) onChange(v);
          }}
          className="w-16 px-1.5 py-0.5 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
        />
      </div>
    </div>
  );
}

interface FormPanelProps {
  params: HallParameters;
  onParamsChange: (params: HallParameters) => void;
  results: CalculationResults;
  profileOverrides?: ProfileOverrides;
  onProfileOverridesChange?: (overrides: ProfileOverrides) => void;
  rafterType?: RafterType;
  onRafterTypeChange?: (type: RafterType) => void;
  customTrussHeight?: number | null;
  onCustomTrussHeightChange?: (height: number | null) => void;
}

export function FormPanel({ params, onParamsChange, results, profileOverrides, onProfileOverridesChange, rafterType, onRafterTypeChange, customTrussHeight, onCustomTrussHeightChange }: FormPanelProps) {
  const { t } = useTranslation();
  const [wizardMode, setWizardMode] = useState(true);
  const [wizardStep, setWizardStep] = useState(0);

  const updateParam = <K extends keyof HallParameters>(key: K, value: HallParameters[K]) => {
    onParamsChange({ ...params, [key]: value });
  };

  const steps = [
    t('wizard.step1'),
    t('wizard.step2'),
    t('wizard.step3'),
  ];

  const GeometrySection = (
    <div className="space-y-3">
      <h3 className="text-xs font-sans font-bold text-text-primary uppercase tracking-wider border-b border-border pb-1">
        {t('sections.geometry')}
      </h3>
      <SliderInput
        label={t('form.span')}
        value={params.span}
        min={10}
        max={30}
        step={0.5}
        unit=" m"
        onChange={(v) => updateParam('span', v)}
      />
      <SliderInput
        label={t('form.length')}
        value={params.length}
        min={20}
        max={100}
        step={1}
        unit=" m"
        onChange={(v) => updateParam('length', v)}
      />
      <SliderInput
        label={t('form.wallHeight')}
        value={params.wallHeight}
        min={4}
        max={10}
        step={0.5}
        unit=" m"
        onChange={(v) => updateParam('wallHeight', v)}
      />
      <SliderInput
        label={t('form.roofAngle')}
        value={params.roofAngle}
        min={5}
        max={25}
        step={1}
        unit="°"
        onChange={(v) => updateParam('roofAngle', v)}
      />
    </div>
  );

  const LoadsSection = (
    <div className="space-y-3">
      <h3 className="text-xs font-sans font-bold text-text-primary uppercase tracking-wider border-b border-border pb-1">
        {t('sections.loads')}
      </h3>
      {/* Snow zone */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-sans">{t('form.snowZone')}</label>
        <select
          value={params.snowZone}
          onChange={(e) => updateParam('snowZone', Number(e.target.value))}
          className="w-full px-2 py-1.5 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
        >
          {[1, 2, 3, 4, 5].map((zone) => (
            <option key={zone} value={zone}>
              {t('form.snowZoneLabel', { zone })}
            </option>
          ))}
        </select>
      </div>
      {/* Wind zone */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-sans">{t('form.windZone')}</label>
        <select
          value={params.windZone}
          onChange={(e) => updateParam('windZone', Number(e.target.value))}
          className="w-full px-2 py-1.5 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
        >
          {[1, 2, 3].map((zone) => (
            <option key={zone} value={zone}>
              {t('form.windZoneLabel', { zone })}
            </option>
          ))}
        </select>
      </div>
      {/* Terrain category */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-sans">{t('form.terrainCategory')}</label>
        <select
          value={params.terrainCategory ?? 2}
          onChange={(e) => updateParam('terrainCategory', Number(e.target.value) as TerrainCategory)}
          className="w-full px-2 py-1.5 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
        >
          {([1, 2, 3, 4] as TerrainCategory[]).map((cat) => (
            <option key={cat} value={cat}>
              {t(`form.terrainCategories.${cat}`)}
            </option>
          ))}
        </select>
      </div>
      {/* Snow exposure */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-sans">{t('form.snowExposure')}</label>
        <select
          value={params.snowExposure ?? 'normal'}
          onChange={(e) => updateParam('snowExposure', e.target.value as SnowExposure)}
          className="w-full px-2 py-1.5 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
        >
          {(['windy', 'normal', 'sheltered'] as SnowExposure[]).map((exp) => (
            <option key={exp} value={exp}>
              {t(`form.snowExposures.${exp}`)}
            </option>
          ))}
        </select>
      </div>
      {/* Covering type */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-sans">{t('form.coveringType')}</label>
        <div className="flex gap-3">
          {(['sheet', 'sandwich'] as CoveringType[]).map((type) => (
            <label key={type} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="coveringType"
                value={type}
                checked={params.coveringType === type}
                onChange={() => updateParam('coveringType', type)}
                className="accent-accent-blue"
              />
              <span className="text-xs font-sans text-text-secondary">
                {t(`form.covering.${type}`)}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const MaterialsSection = (
    <div className="space-y-3">
      <h3 className="text-xs font-sans font-bold text-text-primary uppercase tracking-wider border-b border-border pb-1">
        {t('sections.materials')}
      </h3>
      {/* Steel grade */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-sans">{t('form.steelGrade')}</label>
        <div className="flex gap-3">
          {(['S235', 'S355'] as SteelGrade[]).map((grade) => (
            <label key={grade} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="steelGrade"
                value={grade}
                checked={params.steelGrade === grade}
                onChange={() => updateParam('steelGrade', grade)}
                className="accent-accent-blue"
              />
              <span className="text-xs font-sans text-text-secondary">{grade}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Purlin type */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-sans">{t('form.purlinType')}</label>
        <div className="flex gap-3">
          {(['single', 'continuous'] as const).map((type) => (
            <label key={type} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="purlinType"
                value={type}
                checked={(params.purlinType ?? 'single') === type}
                onChange={() => updateParam('purlinType', type)}
                className="accent-accent-blue"
              />
              <span className="text-xs font-sans text-text-secondary">
                {t(`form.purlinTypes.${type}`)}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  // Determine if truss is active based on rafterType and span
  const currentRafterType = rafterType ?? 'auto';
  const isTrussActive = currentRafterType === 'force_truss' || (currentRafterType === 'auto' && params.span > 18);
  const trussHeightMin = Math.round((params.span / 15) * 10) / 10;
  const trussHeightMax = Math.round((params.span / 8) * 10) / 10;
  const trussHeightDefault = Math.round((params.span / 10) * 10) / 10;
  const currentTrussHeight = customTrussHeight ?? trussHeightDefault;

  const RafterTypeSection = (
    <div className="space-y-3">
      <h3 className="text-xs font-sans font-bold text-text-primary uppercase tracking-wider border-b border-border pb-1">
        {t('rafterType.title')}
      </h3>
      {/* Radio buttons for rafter type */}
      <div className="space-y-1.5">
        {(['auto', 'force_truss', 'force_rafter'] as const).map((type) => (
          <label key={type} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="rafterType"
              value={type}
              checked={currentRafterType === type}
              onChange={() => onRafterTypeChange?.(type)}
              className="accent-accent-blue"
            />
            <span className="text-xs font-sans text-text-secondary">
              {t(`rafterType.${type === 'force_truss' ? 'forceTruss' : type === 'force_rafter' ? 'forceRafter' : 'auto'}`)}
            </span>
          </label>
        ))}
      </div>
      {/* Warning for forced IPE rafter with large span */}
      {currentRafterType === 'force_rafter' && params.span > 18 && (
        <p className="text-xs font-sans text-red-400">
          ⚠️ {t('rafterType.spanWarning')}
        </p>
      )}
      {/* Truss height slider when truss is active */}
      {isTrussActive && (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs text-text-secondary font-sans">{t('rafterType.trussHeight')}</label>
            <span className="text-xs text-accent-blue font-sans font-bold">
              {currentTrussHeight.toFixed(1)} m ({(currentTrussHeight * 1000).toFixed(0)} mm)
            </span>
          </div>
          <input
            type="range"
            min={trussHeightMin}
            max={trussHeightMax}
            step={0.1}
            value={currentTrussHeight}
            onChange={(e) => onCustomTrussHeightChange?.(Number(e.target.value))}
            className="w-full h-1.5 bg-surface-tertiary rounded-lg appearance-none cursor-pointer accent-accent-blue"
          />
          <p className="text-[10px] text-text-secondary font-sans">
            {t('rafterType.trussHeightRange', { min: trussHeightMin.toFixed(1), max: trussHeightMax.toFixed(1) })}
          </p>
        </div>
      )}
    </div>
  );

  const renderWizardContent = () => {
    switch (wizardStep) {
      case 0:
        return GeometrySection;
      case 1:
        return LoadsSection;
      case 2:
        return MaterialsSection;
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-sans font-bold text-accent-blue uppercase tracking-wider">
          {t('form.title')}
        </h2>
        <button
          onClick={() => setWizardMode(!wizardMode)}
          className="text-[10px] font-sans px-2 py-0.5 rounded border border-border text-text-secondary hover:text-accent-blue hover:border-accent-blue transition-colors"
        >
          {wizardMode ? t('form.expertMode') : t('form.wizardMode')}
        </button>
      </div>

      {/* Form content */}
      <div className="flex-1 space-y-4">
        {wizardMode ? (
          <>
            {/* Step indicator */}
            <div className="flex gap-1 mb-3">
              {steps.map((step, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className={`w-full h-1 rounded-full ${
                      idx === wizardStep
                        ? 'bg-accent-blue'
                        : idx < wizardStep
                          ? 'bg-accent-blue-light'
                          : 'bg-surface-tertiary'
                    }`}
                  />
                  <span
                    className={`text-[9px] font-sans ${
                      idx === wizardStep ? 'text-accent-blue' : 'text-text-secondary'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {/* Current step content */}
            {renderWizardContent()}

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
                disabled={wizardStep === 0}
                className="px-3 py-1 text-xs font-sans rounded border border-border text-text-secondary hover:text-accent-blue hover:border-accent-blue disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {t('wizard.back')}
              </button>
              <button
                onClick={() => setWizardStep((s) => Math.min(2, s + 1))}
                disabled={wizardStep === 2}
                className="px-3 py-1 text-xs font-sans rounded border border-accent-blue text-accent-blue hover:bg-accent-blue hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {t('wizard.next')}
              </button>
            </div>

            {/* Rafter type section - always visible in wizard mode */}
            <div className="my-3 border-t border-border" />
            {RafterTypeSection}
          </>
        ) : (
          <>
            {GeometrySection}
            <div className="my-3 border-t border-border" />
            {LoadsSection}
            <div className="my-3 border-t border-border" />
            {MaterialsSection}
            <div className="my-3 border-t border-border" />
            {RafterTypeSection}
          </>
        )}

        {/* Results - always visible */}
        <div className="mt-4 pt-3 border-t border-border">
          <ResultsPanel
            results={results}
            profileOverrides={profileOverrides}
            onProfileOverridesChange={onProfileOverridesChange}
          />
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_PARAMS };

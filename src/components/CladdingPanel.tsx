import { useTranslation } from 'react-i18next';
import { RAL_COLORS, getRALHex } from '../data/colors';
import type { CladdingParameters, CladdingWallType, CladdingRoofType, PanelOrientation, ColorStripe } from '../types';

interface CladdingPanelProps {
  cladding: CladdingParameters;
  onCladdingChange: (cladding: CladdingParameters) => void;
  showCladding: boolean;
  onShowCladdingChange: (show: boolean) => void;
}

function RALColorSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'pl' ? 'pl' : 'en';

  return (
    <div className="space-y-1">
      <label className="text-xs text-text-secondary font-sans">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1.5 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue pl-7"
        >
          {RAL_COLORS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} - {c.name[lang]}
            </option>
          ))}
        </select>
        <span
          className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-sm border border-border"
          style={{ backgroundColor: getRALHex(value) }}
        />
      </div>
    </div>
  );
}

export function CladdingPanel({
  cladding,
  onCladdingChange,
  showCladding,
  onShowCladdingChange,
}: CladdingPanelProps) {
  const { t } = useTranslation();

  const update = <K extends keyof CladdingParameters>(key: K, value: CladdingParameters[K]) => {
    onCladdingChange({ ...cladding, [key]: value });
  };

  const addStripe = () => {
    const newStripe: ColorStripe = {
      wallType: 'side',
      layerStart: 1,
      layerEnd: 2,
      color: 'RAL 7016',
    };
    update('colorStripes', [...cladding.colorStripes, newStripe]);
  };

  const removeStripe = (index: number) => {
    update(
      'colorStripes',
      cladding.colorStripes.filter((_, i) => i !== index)
    );
  };

  const updateStripe = (index: number, field: keyof ColorStripe, value: string | number) => {
    const updated = cladding.colorStripes.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    update('colorStripes', updated);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-sans font-bold text-text-primary uppercase tracking-wider border-b border-border pb-1">
        {t('cladding.title')}
      </h3>

      {/* Show/hide toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showCladding}
          onChange={(e) => onShowCladdingChange(e.target.checked)}
          className="accent-accent-blue"
        />
        <span className="text-xs font-sans text-text-secondary">
          {t('cladding.showCladding')}
        </span>
      </label>

      {/* Side wall type */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-sans">{t('cladding.sideWallType')}</label>
        <select
          value={cladding.sideWallType}
          onChange={(e) => update('sideWallType', e.target.value as CladdingWallType)}
          className="w-full px-2 py-1.5 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
        >
          <option value="trapezoid">{t('cladding.wallTypes.trapezoid')}</option>
          <option value="sandwich">{t('cladding.wallTypes.sandwich')}</option>
        </select>
      </div>

      {/* End wall type */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-sans">{t('cladding.endWallType')}</label>
        <select
          value={cladding.endWallType}
          onChange={(e) => update('endWallType', e.target.value as CladdingWallType)}
          className="w-full px-2 py-1.5 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
        >
          <option value="trapezoid">{t('cladding.wallTypes.trapezoid')}</option>
          <option value="sandwich">{t('cladding.wallTypes.sandwich')}</option>
        </select>
      </div>

      {/* Roof type */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-sans">{t('cladding.roofType')}</label>
        <select
          value={cladding.roofType}
          onChange={(e) => update('roofType', e.target.value as CladdingRoofType)}
          className="w-full px-2 py-1.5 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
        >
          <option value="T18">{t('cladding.roofTypes.T18')}</option>
          <option value="T35">{t('cladding.roofTypes.T35')}</option>
          <option value="sandwich_roof">{t('cladding.roofTypes.sandwich_roof')}</option>
        </select>
      </div>

      {/* Colors */}
      <RALColorSelect
        label={t('cladding.sideWallColor')}
        value={cladding.sideWallColor}
        onChange={(v) => update('sideWallColor', v)}
      />
      <RALColorSelect
        label={t('cladding.endWallColor')}
        value={cladding.endWallColor}
        onChange={(v) => update('endWallColor', v)}
      />
      <RALColorSelect
        label={t('cladding.roofColor')}
        value={cladding.roofColor}
        onChange={(v) => update('roofColor', v)}
      />
      <RALColorSelect
        label={t('cladding.flashingColor')}
        value={cladding.flashingColor}
        onChange={(v) => update('flashingColor', v)}
      />

      {/* Panel orientation */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-sans">{t('cladding.panelOrientation')}</label>
        <div className="flex gap-3">
          {(['horizontal', 'vertical'] as PanelOrientation[]).map((orient) => (
            <label key={orient} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="panelOrientation"
                value={orient}
                checked={cladding.panelOrientation === orient}
                onChange={() => update('panelOrientation', orient)}
                className="accent-accent-blue"
              />
              <span className="text-xs font-sans text-text-secondary">
                {t(`cladding.orientations.${orient}`)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Panel width */}
      <div className="space-y-1">
        <label className="text-xs text-text-secondary font-sans">{t('cladding.panelWidth')}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={500}
            max={1500}
            step={50}
            value={cladding.panelWidth}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 500 && v <= 1500) update('panelWidth', v);
            }}
            className="w-24 px-2 py-1 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
          />
          <span className="text-xs text-text-secondary font-sans">mm</span>
        </div>
      </div>

      {/* Color stripes - only for horizontal orientation */}
      {cladding.panelOrientation === 'horizontal' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs text-text-secondary font-sans font-semibold">
              {t('cladding.colorStripes')}
            </label>
            <button
              onClick={addStripe}
              className="text-[10px] font-sans px-2 py-0.5 rounded border border-border text-accent-blue hover:bg-accent-blue hover:text-white transition-colors"
            >
              + {t('cladding.addStripe')}
            </button>
          </div>

          {cladding.colorStripes.map((stripe, idx) => (
            <div key={idx} className="p-2 border border-border rounded bg-surface-secondary space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-sans text-text-secondary">
                  {t('cladding.stripe')} #{idx + 1}
                </span>
                <button
                  onClick={() => removeStripe(idx)}
                  className="text-[10px] text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
              {/* Wall type */}
              <select
                value={stripe.wallType}
                onChange={(e) => updateStripe(idx, 'wallType', e.target.value)}
                className="w-full px-1.5 py-1 text-[10px] font-sans bg-white border border-border rounded"
              >
                <option value="side">{t('cladding.stripeWall.side')}</option>
                <option value="end">{t('cladding.stripeWall.end')}</option>
              </select>
              {/* Layer range */}
              <div className="flex gap-2 items-center">
                <span className="text-[10px] text-text-secondary">{t('cladding.layerFrom')}</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={stripe.layerStart}
                  onChange={(e) => updateStripe(idx, 'layerStart', Number(e.target.value))}
                  className="w-12 px-1 py-0.5 text-[10px] bg-white border border-border rounded"
                />
                <span className="text-[10px] text-text-secondary">{t('cladding.layerTo')}</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={stripe.layerEnd}
                  onChange={(e) => updateStripe(idx, 'layerEnd', Number(e.target.value))}
                  className="w-12 px-1 py-0.5 text-[10px] bg-white border border-border rounded"
                />
              </div>
              {/* Color */}
              <select
                value={stripe.color}
                onChange={(e) => updateStripe(idx, 'color', e.target.value)}
                className="w-full px-1.5 py-1 text-[10px] font-sans bg-white border border-border rounded"
              >
                {RAL_COLORS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

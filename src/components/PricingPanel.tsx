import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PricingData } from '../data/pricing';
import type { PricingResult } from '../utils/pricing';

interface PricingPanelProps {
  pricing: PricingData;
  onPricingChange: (pricing: PricingData) => void;
  pricingResult: PricingResult;
}

const CATEGORY_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-red-500',
  'bg-cyan-500',
  'bg-orange-500',
];

export function PricingPanel({ pricing, onPricingChange, pricingResult }: PricingPanelProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  const updatePricing = <K extends keyof PricingData>(key: K, value: PricingData[K]) => {
    onPricingChange({ ...pricing, [key]: value });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-3">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <h3 className="text-xs font-sans font-bold text-text-primary uppercase tracking-wider border-b border-border pb-1 flex-1">
          {t('pricing.title')}
        </h3>
        <span className="text-xs text-text-secondary ml-2">
          {collapsed ? '▶' : '▼'}
        </span>
      </div>

      {!collapsed && (
        <div className="space-y-4">
          {/* Cost breakdown table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-sans">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1 text-text-secondary font-normal">{t('pricing.column.name')}</th>
                  <th className="text-right py-1 text-text-secondary font-normal">{t('pricing.column.quantity')}</th>
                  <th className="text-center py-1 text-text-secondary font-normal">{t('pricing.column.unit')}</th>
                  <th className="text-right py-1 text-text-secondary font-normal">{t('pricing.column.unitPrice')}</th>
                  <th className="text-right py-1 text-text-secondary font-normal">{t('pricing.column.total')}</th>
                </tr>
              </thead>
              <tbody>
                {pricingResult.categories.map((cat, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="py-1.5 text-text-primary">{t(cat.name)}</td>
                    <td className="py-1.5 text-right text-text-secondary">
                      {cat.quantity.toLocaleString('pl-PL')}
                    </td>
                    <td className="py-1.5 text-center text-text-secondary">{cat.unit}</td>
                    <td className="py-1.5 text-right">
                      {(() => {
                        // Map category index to pricing key
                        const keyMap: (keyof PricingData | null)[] = [
                          null, // steel - blended rate (main + purlins), edit in detailed section
                          null, // cladding - averaged, edit in detailed section
                          null, // openings - averaged, edit in detailed section
                          'skylightPerM',
                          'flashingsPerSqm',
                          'gutterPerM',
                          'installDayRate',
                        ];
                        const key = keyMap[idx];
                        if (key) {
                          return (
                            <input
                              type="number"
                              value={cat.unitPrice}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val >= 0) {
                                  updatePricing(key, val);
                                }
                              }}
                              step="0.01"
                              min="0"
                              className="w-20 px-1 py-0.5 text-right text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
                            />
                          );
                        }
                        // Non-editable averaged/blended prices - display as read-only
                        return (
                          <span className="inline-block w-20 px-1 py-0.5 text-right text-xs font-sans text-text-secondary">
                            {cat.unitPrice.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-1.5 text-right text-text-primary font-medium">
                      {formatCurrency(cat.total)} zl
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detailed pricing inputs */}
          <div className="space-y-2 border-t border-border pt-2">
            <h4 className="text-[10px] font-sans font-bold text-text-secondary uppercase">
              {t('pricing.detailedPrices')}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <PriceInput
                label={t('pricing.prices.steelMain')}
                value={pricing.steelMain}
                unit="PLN/kg"
                onChange={(v) => updatePricing('steelMain', v)}
              />
              <PriceInput
                label={t('pricing.prices.steelPurlins')}
                value={pricing.steelPurlins}
                unit="PLN/kg"
                onChange={(v) => updatePricing('steelPurlins', v)}
              />
              <PriceInput
                label={t('pricing.prices.sandwichWall')}
                value={pricing.sandwichWall}
                unit="PLN/m\u00B2"
                onChange={(v) => updatePricing('sandwichWall', v)}
              />
              <PriceInput
                label={t('pricing.prices.sandwichRoof')}
                value={pricing.sandwichRoof}
                unit="PLN/m\u00B2"
                onChange={(v) => updatePricing('sandwichRoof', v)}
              />
              <PriceInput
                label={t('pricing.prices.sheetT18')}
                value={pricing.sheetT18}
                unit="PLN/m\u00B2"
                onChange={(v) => updatePricing('sheetT18', v)}
              />
              <PriceInput
                label={t('pricing.prices.sheetT35')}
                value={pricing.sheetT35}
                unit="PLN/m\u00B2"
                onChange={(v) => updatePricing('sheetT35', v)}
              />
              <PriceInput
                label={t('pricing.prices.gateSlidingPerSqm')}
                value={pricing.gateSlidingPerSqm}
                unit="PLN/m\u00B2"
                onChange={(v) => updatePricing('gateSlidingPerSqm', v)}
              />
              <PriceInput
                label={t('pricing.prices.gateSectionalPerSqm')}
                value={pricing.gateSectionalPerSqm}
                unit="PLN/m\u00B2"
                onChange={(v) => updatePricing('gateSectionalPerSqm', v)}
              />
              <PriceInput
                label={t('pricing.prices.doorPerPiece')}
                value={pricing.doorPerPiece}
                unit="PLN/szt."
                onChange={(v) => updatePricing('doorPerPiece', v)}
              />
              <PriceInput
                label={t('pricing.prices.windowPerSqm')}
                value={pricing.windowPerSqm}
                unit="PLN/m\u00B2"
                onChange={(v) => updatePricing('windowPerSqm', v)}
              />
              <PriceInput
                label={t('pricing.prices.skylightPerM')}
                value={pricing.skylightPerM}
                unit="PLN/m"
                onChange={(v) => updatePricing('skylightPerM', v)}
              />
              <PriceInput
                label={t('pricing.prices.flashingsPerSqm')}
                value={pricing.flashingsPerSqm}
                unit="PLN/m\u00B2"
                onChange={(v) => updatePricing('flashingsPerSqm', v)}
              />
              <PriceInput
                label={t('pricing.prices.gutterPerM')}
                value={pricing.gutterPerM}
                unit="PLN/m"
                onChange={(v) => updatePricing('gutterPerM', v)}
              />
            </div>
          </div>

          {/* Installation section */}
          <div className="space-y-2 border-t border-border pt-2">
            <h4 className="text-[10px] font-sans font-bold text-text-secondary uppercase">
              {t('pricing.installation')}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <PriceInput
                label={t('pricing.installDays')}
                value={pricing.installDays}
                unit={t('pricing.daysUnit')}
                onChange={(v) => updatePricing('installDays', v)}
                step={1}
              />
              <PriceInput
                label={t('pricing.installDayRate')}
                value={pricing.installDayRate}
                unit="PLN"
                onChange={(v) => updatePricing('installDayRate', v)}
              />
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 border-t border-border pt-2">
            <div className="flex justify-between text-xs font-sans">
              <span className="text-text-secondary">{t('pricing.totalNet')}</span>
              <span className="text-text-primary font-bold">{formatCurrency(pricingResult.totalNet)} PLN</span>
            </div>
            <div className="flex justify-between text-xs font-sans">
              <span className="text-text-secondary">{t('pricing.vat')}</span>
              <span className="text-text-primary">{formatCurrency(pricingResult.vat)} PLN</span>
            </div>
            <div className="flex justify-between text-xs font-sans">
              <span className="text-text-secondary font-bold">{t('pricing.totalGross')}</span>
              <span className="text-accent-blue font-bold">{formatCurrency(pricingResult.totalGross)} PLN</span>
            </div>
          </div>

          {/* Per m2 stats */}
          <div className="space-y-1.5 border-t border-border pt-2">
            <div className="flex justify-between text-xs font-sans">
              <span className="text-text-secondary">{t('pricing.costPerM2')}</span>
              <span className="text-text-primary font-medium">
                {formatCurrency(pricingResult.costPerM2)} PLN/m\u00B2
              </span>
            </div>
            <div className="flex justify-between text-xs font-sans">
              <span className="text-text-secondary">{t('pricing.steelMassPerM2')}</span>
              <span className="text-text-primary font-medium">
                {pricingResult.steelMassPerM2.toFixed(2)} kg/m\u00B2
              </span>
            </div>
          </div>

          {/* Category bar chart */}
          <div className="space-y-2 border-t border-border pt-2">
            <h4 className="text-[10px] font-sans font-bold text-text-secondary uppercase">
              {t('pricing.breakdown')}
            </h4>
            <div className="space-y-1.5">
              {pricingResult.categoryPercentages.map((cat, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between text-[10px] font-sans">
                    <span className="text-text-secondary">{t(cat.name)}</span>
                    <span className="text-text-primary">{cat.percent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}`}
                      style={{ width: `${Math.min(100, cat.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PriceInputProps {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  step?: number;
}

function PriceInput({ label, value, unit, onChange, step = 0.5 }: PriceInputProps) {
  return (
    <div className="space-y-0.5">
      <label className="text-[10px] text-text-secondary font-sans block">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          step={step}
          min={0}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= 0) onChange(v);
          }}
          className="w-full px-1.5 py-0.5 text-xs font-sans text-text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-blue"
        />
        <span className="text-[9px] text-text-secondary whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );
}

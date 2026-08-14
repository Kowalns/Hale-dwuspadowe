import { useTranslation } from 'react-i18next';
import type { CalculationResults } from '../types';

interface ResultsPanelProps {
  results: CalculationResults;
}

function getUtilizationColor(eta: number): string {
  if (eta < 0.85) return 'text-green-400';
  if (eta <= 0.95) return 'text-yellow-400';
  return 'text-red-400';
}

function ProfileCard({ label, name, mass, wPl }: { label: string; name: string; mass: number; wPl: number }) {
  return (
    <div className="p-2 rounded border border-dark-tertiary bg-dark-primary/50">
      <p className="text-xs text-text-secondary font-mono uppercase">{label}</p>
      <p className="text-sm text-accent-orange font-mono font-bold mt-0.5">{name}</p>
      <div className="flex gap-3 mt-1 text-xs text-text-secondary font-mono">
        <span>{mass} kg/m</span>
        <span>W<sub>pl</sub>={wPl} cm&sup3;</span>
      </div>
    </div>
  );
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  const { t } = useTranslation();

  const utilizationColor = getUtilizationColor(results.utilizationRatio);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-mono font-bold text-accent-yellow uppercase tracking-wider">
        {t('results.title')}
      </h3>

      {/* Utilization and governing info */}
      <div className="p-2 rounded border border-dark-tertiary bg-dark-primary/50 space-y-1">
        <p className="text-xs text-text-secondary font-mono">
          {t('results.utilization')}:{' '}
          <span className={`font-bold ${utilizationColor}`}>
            {results.sideColumnProfile.name}, &eta; = {results.utilizationRatio.toFixed(2)}
          </span>
        </p>
        <p className="text-xs text-text-secondary font-mono">
          {t('results.governingCombination')}:{' '}
          <span className="text-text-primary">{results.governingCombination}</span>
        </p>
        <p className="text-xs text-text-secondary font-mono">
          {t('results.governingCondition')}:{' '}
          <span className="text-text-primary">{t(`results.conditions.${results.governingCondition}`)}</span>
        </p>
        <p className="text-xs text-text-secondary font-mono">
          {t('results.steelMass')}:{' '}
          <span className="text-text-primary">{results.steelMassPerM2.toFixed(1)} kg/m&sup2;</span>
        </p>
      </div>

      {/* Deflection check */}
      <div className="p-2 rounded border border-dark-tertiary bg-dark-primary/50 space-y-1">
        <p className="text-xs text-text-secondary font-mono font-bold uppercase">
          {t('results.deflection')}
        </p>
        <p className="text-xs text-text-secondary font-mono">
          {t('results.columnDeflection')}:{' '}
          <span className={results.columnDeflection <= results.columnDeflectionLimit ? 'text-green-400' : 'text-red-400'}>
            {results.columnDeflection.toFixed(1)} / {results.columnDeflectionLimit.toFixed(1)} mm
          </span>
        </p>
        <p className="text-xs text-text-secondary font-mono">
          {t('results.rafterDeflection')}:{' '}
          <span className={results.rafterDeflection <= results.rafterDeflectionLimit ? 'text-green-400' : 'text-red-400'}>
            {results.rafterDeflection.toFixed(1)} / {results.rafterDeflectionLimit.toFixed(1)} mm
          </span>
        </p>
        <p className="text-xs text-text-secondary font-mono">
          {t('results.deflectionStatus')}:{' '}
          <span className={results.deflectionCheck ? 'text-green-400' : 'text-red-400'}>
            {results.deflectionCheck ? 'OK' : t('results.exceeded')}
          </span>
        </p>
      </div>

      {/* Geometry summary */}
      <div className="p-2 rounded border border-dark-tertiary bg-dark-primary/50 space-y-1">
        <p className="text-xs text-text-secondary font-mono">
          {t('results.columnSpacing')}: <span className="text-text-primary">{results.columnSpacing.toFixed(2)} m</span>
        </p>
        <p className="text-xs text-text-secondary font-mono">
          {t('results.purlinSpacing')}: <span className="text-text-primary">{results.purlinSpacing.toFixed(2)} m</span>
        </p>
        <p className="text-xs text-text-secondary font-mono">
          {t('results.ridgeHeight')}: <span className="text-text-primary">{results.ridgeHeight.toFixed(2)} m</span>
        </p>
        <p className="text-xs text-text-secondary font-mono">
          {t('results.numberOfFrames')}: <span className="text-text-primary">{results.numberOfFrames}</span>
        </p>
        {results.trussHeight && (
          <p className="text-xs text-text-secondary font-mono">
            {t('results.trussHeight')}: <span className="text-text-primary">{results.trussHeight.toFixed(2)} m</span>
          </p>
        )}
      </div>

      {/* Profiles */}
      <div className="space-y-1.5">
        <ProfileCard
          label={t('results.sideColumn')}
          name={results.sideColumnProfile.name}
          mass={results.sideColumnProfile.mass}
          wPl={results.sideColumnProfile.W_pl}
        />
        <ProfileCard
          label={t('results.endColumn')}
          name={results.endColumnProfile.name}
          mass={results.endColumnProfile.mass}
          wPl={results.endColumnProfile.W_pl}
        />
        {results.rafterProfile && (
          <ProfileCard
            label={t('results.rafter')}
            name={results.rafterProfile.name}
            mass={results.rafterProfile.mass}
            wPl={results.rafterProfile.W_pl}
          />
        )}
        {results.trussChordProfile && (
          <ProfileCard
            label={t('results.trussChord')}
            name={results.trussChordProfile.name}
            mass={results.trussChordProfile.mass}
            wPl={results.trussChordProfile.W_pl}
          />
        )}
        <ProfileCard
          label={t('results.purlin')}
          name={results.purlinProfile.name}
          mass={results.purlinProfile.mass}
          wPl={results.purlinProfile.W_pl}
        />
        <div className="p-2 rounded border border-dark-tertiary bg-dark-primary/50">
          <p className="text-xs text-text-secondary font-mono uppercase">{t('results.bracing')}</p>
          <p className="text-sm text-accent-orange font-mono font-bold mt-0.5">
            ∅{results.bracingDiameter} mm
          </p>
        </div>
      </div>
    </div>
  );
}

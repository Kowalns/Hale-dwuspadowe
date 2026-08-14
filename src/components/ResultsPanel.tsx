import { useTranslation } from 'react-i18next';
import type { CalculationResults, ProfileOverrides, SteelProfile } from '../types';
import { ipeProfiles, rhsProfiles, zProfiles, trussChordProfiles } from '../data/profiles';

interface ResultsPanelProps {
  results: CalculationResults;
  profileOverrides?: ProfileOverrides;
  onProfileOverridesChange?: (overrides: ProfileOverrides) => void;
}

function getUtilizationColor(eta: number): string {
  if (eta < 0.85) return 'text-green-400';
  if (eta <= 0.95) return 'text-yellow-400';
  return 'text-red-400';
}

/** Get available profiles for a given profile type */
function getProfilesForType(type: 'sideColumn' | 'endColumn' | 'rafter' | 'trussChord' | 'purlin'): SteelProfile[] {
  switch (type) {
    case 'sideColumn':
      return ipeProfiles.filter(p => p.h >= 160);
    case 'rafter':
      return ipeProfiles.filter(p => p.h >= 160);
    case 'endColumn':
      return rhsProfiles;
    case 'trussChord':
      return trussChordProfiles;
    case 'purlin':
      return zProfiles;
  }
}

interface ProfileCardWithOverrideProps {
  label: string;
  profile: SteelProfile;
  overrideKey: keyof ProfileOverrides;
  profileOverrides?: ProfileOverrides;
  onProfileOverridesChange?: (overrides: ProfileOverrides) => void;
  utilizationRatio?: number;
}

function ProfileCardWithOverride({
  label,
  profile,
  overrideKey,
  profileOverrides,
  onProfileOverridesChange,
  utilizationRatio,
}: ProfileCardWithOverrideProps) {
  const { t } = useTranslation();
  const availableProfiles = getProfilesForType(overrideKey);
  const overriddenName = profileOverrides?.[overrideKey];
  const isOverridden = overriddenName !== undefined && overriddenName !== profile.name;
  const isOverUtilized = utilizationRatio !== undefined && utilizationRatio > 1.0;

  // Find the actual displayed profile (if overridden, it might differ from the calculated one)
  const displayedProfile = isOverridden
    ? availableProfiles.find(p => p.name === overriddenName) ?? profile
    : profile;

  return (
    <div className={`p-2 rounded border ${isOverUtilized ? 'border-red-500' : 'border-dark-tertiary'} bg-dark-primary/50`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary font-mono uppercase">{label}</p>
        <div className="flex items-center gap-1">
          {isOverridden && (
            <span className="text-[10px] text-accent-yellow" title={t('override.manuallyChanged')}>
              ✱
            </span>
          )}
          {isOverUtilized && (
            <span className="text-[10px] text-red-400" title={t('override.utilizationWarning')}>
              ⚠️
            </span>
          )}
          {isOverridden && onProfileOverridesChange && (
            <button
              onClick={() => {
                const newOverrides = { ...profileOverrides };
                delete newOverrides[overrideKey];
                onProfileOverridesChange(newOverrides);
              }}
              className="text-[10px] font-mono text-text-secondary hover:text-accent-orange transition-colors"
              title={t('override.resetToCalculated')}
            >
              🔄
            </button>
          )}
        </div>
      </div>
      {/* Dropdown for profile selection */}
      {onProfileOverridesChange ? (
        <select
          value={displayedProfile.name}
          onChange={(e) => {
            const newName = e.target.value;
            if (newName === profile.name) {
              // Reset to calculated
              const newOverrides = { ...profileOverrides };
              delete newOverrides[overrideKey];
              onProfileOverridesChange(newOverrides);
            } else {
              onProfileOverridesChange({
                ...profileOverrides,
                [overrideKey]: newName,
              });
            }
          }}
          className="w-full mt-0.5 px-1.5 py-0.5 text-sm font-mono font-bold text-accent-orange bg-dark-primary border border-dark-tertiary rounded focus:outline-none focus:ring-1 focus:ring-accent-orange appearance-none cursor-pointer"
        >
          {availableProfiles.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}{p.name === profile.name ? ' (calc)' : ''}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-sm text-accent-orange font-mono font-bold mt-0.5">{displayedProfile.name}</p>
      )}
      <div className="flex gap-3 mt-1 text-xs text-text-secondary font-mono">
        <span>{displayedProfile.mass} kg/m</span>
        <span>W<sub>pl</sub>={displayedProfile.W_pl} cm&sup3;</span>
      </div>
      {isOverUtilized && utilizationRatio !== undefined && (
        <p className="text-[10px] font-mono text-red-400 mt-0.5">
          ⚠️ &eta; = {utilizationRatio.toFixed(2)} {t('override.overUtilized')}
        </p>
      )}
    </div>
  );
}

export function ResultsPanel({ results, profileOverrides, onProfileOverridesChange }: ResultsPanelProps) {
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

      {/* Profiles with override dropdowns */}
      <div className="space-y-1.5">
        <ProfileCardWithOverride
          label={t('results.sideColumn')}
          profile={results.sideColumnProfile}
          overrideKey="sideColumn"
          profileOverrides={profileOverrides}
          onProfileOverridesChange={onProfileOverridesChange}
          utilizationRatio={results.utilizationRatio}
        />
        <ProfileCardWithOverride
          label={t('results.endColumn')}
          profile={results.endColumnProfile}
          overrideKey="endColumn"
          profileOverrides={profileOverrides}
          onProfileOverridesChange={onProfileOverridesChange}
          utilizationRatio={results.endColumnUtilization}
        />
        {results.rafterProfile && (
          <ProfileCardWithOverride
            label={t('results.rafter')}
            profile={results.rafterProfile}
            overrideKey="rafter"
            profileOverrides={profileOverrides}
            onProfileOverridesChange={onProfileOverridesChange}
            utilizationRatio={results.rafterUtilization}
          />
        )}
        {results.trussChordProfile && (
          <ProfileCardWithOverride
            label={t('results.trussChord')}
            profile={results.trussChordProfile}
            overrideKey="trussChord"
            profileOverrides={profileOverrides}
            onProfileOverridesChange={onProfileOverridesChange}
            utilizationRatio={results.trussChordUtilization}
          />
        )}
        <ProfileCardWithOverride
          label={t('results.purlin')}
          profile={results.purlinProfile}
          overrideKey="purlin"
          profileOverrides={profileOverrides}
          onProfileOverridesChange={onProfileOverridesChange}
          utilizationRatio={results.purlinUtilization}
        />
        <div className="p-2 rounded border border-dark-tertiary bg-dark-primary/50">
          <p className="text-xs text-text-secondary font-mono uppercase">{t('results.bracing')}</p>
          <p className="text-sm text-accent-orange font-mono font-bold mt-0.5">
            &empty;{results.bracingDiameter} mm
          </p>
        </div>
      </div>

      {/* Connection plates */}
      <div className="p-2 rounded border border-dark-tertiary bg-dark-primary/50 space-y-1.5">
        <p className="text-xs text-text-secondary font-mono font-bold uppercase">
          {t('connectionPlates.title')}
        </p>
        <p className="text-xs text-text-secondary font-mono">
          {t('connectionPlates.totalPlateMass')}:{' '}
          <span className="text-accent-orange font-bold">{results.connectionPlates.totalMass.toFixed(1)} kg</span>
        </p>
        {/* Base plate */}
        <div className="pl-2 border-l border-dark-tertiary space-y-0.5">
          <p className="text-[10px] text-text-secondary font-mono">
            {t('connectionPlates.basePlate')}:{' '}
            <span className="text-text-primary">
              {results.connectionPlates.basePlate.count}x {results.connectionPlates.basePlate.mass.toFixed(1)} kg
            </span>
          </p>
          <p className="text-[10px] text-text-secondary font-mono">
            {t('connectionPlates.dimensions')}: {results.connectionPlates.basePlate.width}x{results.connectionPlates.basePlate.height}x{results.connectionPlates.basePlate.thickness} mm
          </p>
          <p className="text-[10px] text-text-secondary font-mono">
            {t('connectionPlates.anchors')}: {results.connectionPlates.basePlate.bolts}
          </p>
        </div>
        {/* End plate */}
        <div className="pl-2 border-l border-dark-tertiary space-y-0.5">
          <p className="text-[10px] text-text-secondary font-mono">
            {t('connectionPlates.endPlate')}:{' '}
            <span className="text-text-primary">
              {results.connectionPlates.endPlate.count}x {results.connectionPlates.endPlate.mass.toFixed(1)} kg
            </span>
          </p>
          <p className="text-[10px] text-text-secondary font-mono">
            {t('connectionPlates.dimensions')}: {results.connectionPlates.endPlate.width}x{results.connectionPlates.endPlate.height}x{results.connectionPlates.endPlate.thickness} mm
          </p>
          <p className="text-[10px] text-text-secondary font-mono">
            {t('connectionPlates.bolts')}: {results.connectionPlates.endPlate.bolts}
          </p>
        </div>
        {/* Ridge plate */}
        <div className="pl-2 border-l border-dark-tertiary space-y-0.5">
          <p className="text-[10px] text-text-secondary font-mono">
            {t('connectionPlates.ridgePlate')}:{' '}
            <span className="text-text-primary">
              {results.connectionPlates.ridgePlate.count}x {results.connectionPlates.ridgePlate.mass.toFixed(1)} kg
            </span>
          </p>
          <p className="text-[10px] text-text-secondary font-mono">
            {t('connectionPlates.dimensions')}: {results.connectionPlates.ridgePlate.width}x{results.connectionPlates.ridgePlate.height}x{results.connectionPlates.ridgePlate.thickness} mm
          </p>
          <p className="text-[10px] text-text-secondary font-mono">
            {t('connectionPlates.bolts')}: {results.connectionPlates.ridgePlate.bolts}
          </p>
        </div>
      </div>
    </div>
  );
}

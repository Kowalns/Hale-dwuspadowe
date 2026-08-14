import { useTranslation } from 'react-i18next'

export function FormPanel() {
  const { t } = useTranslation()

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-base font-mono font-bold text-accent-orange mb-4 uppercase tracking-wider">
        {t('form.title')}
      </h2>
      <div className="space-y-4">
        <div className="p-3 rounded border border-dark-tertiary bg-dark-primary/50">
          <p className="text-sm text-text-secondary font-mono">
            {t('sections.geometry')}
          </p>
          <div className="mt-2 space-y-2 text-xs text-text-secondary">
            <p>{t('form.span')}: {t('form.range.span')}</p>
            <p>{t('form.length')}: {t('form.range.length')}</p>
            <p>{t('form.wallHeight')}: {t('form.range.wallHeight')}</p>
            <p>{t('form.roofAngle')}: {t('form.range.roofAngle')}</p>
          </div>
        </div>
        <div className="p-3 rounded border border-dark-tertiary bg-dark-primary/50">
          <p className="text-sm text-text-secondary font-mono">
            {t('sections.materials')}
          </p>
          <div className="mt-2 text-xs text-text-secondary">
            <p>{t('form.steelGrade')}: S235 / S355</p>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useTranslation } from 'react-i18next'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'pl' ? 'en' : 'pl'
    i18n.changeLanguage(newLang)
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1 px-3 py-1.5 rounded border border-border 
                 bg-surface-secondary hover:border-accent-blue hover:text-accent-blue 
                 transition-colors text-sm font-sans text-text-primary cursor-pointer"
      aria-label="Switch language"
    >
      <span className={i18n.language === 'pl' ? 'text-accent-blue' : 'text-text-secondary'}>
        PL
      </span>
      <span className="text-text-secondary">/</span>
      <span className={i18n.language === 'en' ? 'text-accent-blue' : 'text-text-secondary'}>
        EN
      </span>
    </button>
  )
}

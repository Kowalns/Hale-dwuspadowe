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
      className="flex items-center gap-1 px-3 py-1.5 rounded border border-dark-tertiary 
                 bg-dark-secondary hover:border-accent-orange hover:text-accent-orange 
                 transition-colors text-sm font-mono text-text-primary cursor-pointer"
      aria-label="Switch language"
    >
      <span className={i18n.language === 'pl' ? 'text-accent-orange' : 'text-text-secondary'}>
        PL
      </span>
      <span className="text-text-secondary">/</span>
      <span className={i18n.language === 'en' ? 'text-accent-orange' : 'text-text-secondary'}>
        EN
      </span>
    </button>
  )
}

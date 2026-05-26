import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const next = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="fixed top-4 right-4 z-50 glass-card px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-orange-400 transition-colors"
    >
      {i18n.language === 'en' ? '🇪🇸 ES' : '🇺🇸 EN'}
    </button>
  );
}

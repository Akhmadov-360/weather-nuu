import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ruCommon from '@/assets/locales/ru/common.json';
import enCommon from '@/assets/locales/en/common.json';
import uzCommon from '@/assets/locales/uz/common.json';

const STORAGE_KEY = 'cansat_lang';

const savedLanguage = localStorage.getItem(STORAGE_KEY);

i18n.use(initReactI18next).init({
  resources: {
    ru: { common: ruCommon },
    en: { common: enCommon },
    uz: { common: uzCommon },
  },
  lng: savedLanguage ?? 'ru',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (language) => {
  localStorage.setItem(STORAGE_KEY, language);
});

export { i18n };

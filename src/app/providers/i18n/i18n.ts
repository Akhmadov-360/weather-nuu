import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ruAnalytics from '@/assets/locales/ru/analytics.json';
import ruCommon from '@/assets/locales/ru/common.json';
import ruMap from '@/assets/locales/ru/map.json';
import enAnalytics from '@/assets/locales/en/analytics.json';
import enCommon from '@/assets/locales/en/common.json';
import enMap from '@/assets/locales/en/map.json';
import uzAnalytics from '@/assets/locales/uz/analytics.json';
import uzCommon from '@/assets/locales/uz/common.json';
import uzMap from '@/assets/locales/uz/map.json';

const STORAGE_KEY = 'cansat_lang';

const savedLanguage = localStorage.getItem(STORAGE_KEY);

i18n.use(initReactI18next).init({
  resources: {
    ru: { common: ruCommon, map: ruMap, analytics: ruAnalytics },
    en: { common: enCommon, map: enMap, analytics: enAnalytics },
    uz: { common: uzCommon, map: uzMap, analytics: uzAnalytics },
  },
  ns: ['common', 'map', 'analytics'],
  lng: savedLanguage ?? 'ru',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (language) => {
  localStorage.setItem(STORAGE_KEY, language);
});

export { i18n };

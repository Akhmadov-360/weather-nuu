import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ruAnalytics from '@/assets/locales/ru/analytics.json';
import ruAssistant from '@/assets/locales/ru/assistant.json';
import ruCommon from '@/assets/locales/ru/common.json';
import ruEvents from '@/assets/locales/ru/events.json';
import ruMap from '@/assets/locales/ru/map.json';
import enAnalytics from '@/assets/locales/en/analytics.json';
import enAssistant from '@/assets/locales/en/assistant.json';
import enCommon from '@/assets/locales/en/common.json';
import enEvents from '@/assets/locales/en/events.json';
import enMap from '@/assets/locales/en/map.json';
import uzAnalytics from '@/assets/locales/uz/analytics.json';
import uzAssistant from '@/assets/locales/uz/assistant.json';
import uzCommon from '@/assets/locales/uz/common.json';
import uzEvents from '@/assets/locales/uz/events.json';
import uzMap from '@/assets/locales/uz/map.json';

const STORAGE_KEY = 'cansat_lang';

const savedLanguage = localStorage.getItem(STORAGE_KEY);

i18n.use(initReactI18next).init({
  resources: {
    ru: { common: ruCommon, events: ruEvents, map: ruMap, analytics: ruAnalytics, assistant: ruAssistant },
    en: { common: enCommon, events: enEvents, map: enMap, analytics: enAnalytics, assistant: enAssistant },
    uz: { common: uzCommon, events: uzEvents, map: uzMap, analytics: uzAnalytics, assistant: uzAssistant },
  },
  ns: ['common', 'map', 'analytics', 'assistant', 'events'],
  lng: savedLanguage ?? 'ru',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (language) => {
  localStorage.setItem(STORAGE_KEY, language);
});

export { i18n };

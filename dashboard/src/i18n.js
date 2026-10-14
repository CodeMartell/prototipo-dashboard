import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationPT from './locales/pt.json';
import translationEN from './locales/en.json';
import translationKO from './locales/ko.json';

const resources = {
  pt: { translation: translationPT },
  en: { translation: translationEN },
  ko: { translation: translationKO }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;

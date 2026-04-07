import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        supportedLngs: ['en', 'de', 'ja'],
        nonExplicitSupportedLngs: true,
        load: 'languageOnly',
        interpolation: { escapeValue: false },
        resources: {
            en: { translation: en },
            de: { translation: de },
            ja: { translation: ja },
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    });

export default i18n;

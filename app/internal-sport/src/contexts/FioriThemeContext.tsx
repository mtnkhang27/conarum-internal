import React, { createContext, useContext, useEffect, useState } from 'react';
import i18n from '../i18n';
import { getInitialFLPParams } from '../hooks/useFLPSync';

interface FioriThemeContextType {
    language: string;
    theme: string;
    setLanguage: (lang: string) => void;
    setTheme: (theme: string) => void;
}

const defaultContext: FioriThemeContextType = {
    language: 'en',
    theme: '',
    setLanguage: () => { },
    setTheme: () => { },
};

export const FioriThemeContext = createContext<FioriThemeContextType>(defaultContext);
export const useFioriTheme = () => useContext(FioriThemeContext);

export function FioriThemeProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState('en');
    const [theme, setThemeState] = useState('');

    // Apply theme to document element whenever theme changes
    useEffect(() => {
        console.log('Applying SAP theme:', theme);
        document.documentElement.setAttribute('data-sap-theme', theme);

        // Add theme class for SAP UI5 compatibility
        document.body.className = document.body.className.replace(/sapUiTheme-\S+/g, '');
        document.body.classList.add(`sapUiTheme-${theme}`);
    }, [theme]);

    useEffect(() => {
        // Get SAP params from parent FLP (iframe-safe)
        const { locale, theme: themeParam } = getInitialFLPParams();

        console.log('URL params - sap-locale:', locale, 'sap-theme:', themeParam);

        if (locale) {
            setLanguageState(locale);
            i18n.changeLanguage(locale);
        }

        if (themeParam) {
            setThemeState(themeParam);
        }
    }, []);

    const setLanguage = (lang: string) => {
        setLanguageState(lang);
        i18n.changeLanguage(lang);
    };

    const setTheme = (thm: string) => {
        setThemeState(thm);
        console.log('Theme changed programmatically to:', thm);
    };

    const value = {
        language,
        theme,
        setLanguage,
        setTheme,
    };

    return (
        <FioriThemeContext.Provider value={value}>
            {children}
        </FioriThemeContext.Provider>
    );
}

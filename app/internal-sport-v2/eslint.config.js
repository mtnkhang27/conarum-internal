import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import i18next from 'eslint-plugin-i18next'
import unusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    { ignores: ['dist'] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            'i18next': i18next,
            'unused-imports': unusedImports,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'warn',
            'unused-imports/no-unused-vars': ['warn', {
                vars: 'all',
                varsIgnorePattern: '^_',
                args: 'after-used',
                argsIgnorePattern: '^_',
            }],
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
            'i18next/no-literal-string': ['warn', {
                mode: 'jsx-text-only',
                'jsx-attributes': {
                    include: ['label', 'placeholder', 'alt', 'title', 'aria-label'],
                },
                words: {
                    exclude: [
                        // Single characters, numbers, and punctuation
                        '[0-9!-/:-@\\[-`{-~]+',
                        '[A-Z][_A-Z0-9]+',  // CONSTANTS like CSS classes
                    ],
                },
            }],
        },
    },
)

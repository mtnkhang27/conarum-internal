module.exports = {
    input: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.spec.{ts,tsx}',
        '!**/node_modules/**',
    ],
    output: './',
    options: {
        debug: false,
        removeUnusedKeys: false,
        sort: true,
        func: false, // Disabled — we use custom transform instead
        trans: false, // Disabled — not used in this project
        lngs: ['en', 'de'],
        defaultLng: 'en',
        defaultNs: 'translation',
        defaultValue: '',
        resource: {
            loadPath: 'src/locales/{{lng}}.json',
            savePath: 'src/locales/{{lng}}.json',
            jsonIndent: 4,
            lineEnding: '\r\n',
        },
        nsSeparator: false,
        keySeparator: '.',
        interpolation: {
            prefix: '{{',
            suffix: '}}',
        },
    },
    // Custom transform: scan for t() calls and add keys WITHOUT plural suffixes.
    // This project uses {{count}} as simple string interpolation, not i18next plurals.
    transform: function customTransform(file, enc, done) {
        const { parser } = this;
        const content = file.contents.toString(enc);

        parser.parseFuncFromString(content, { list: ['t', 'i18next.t'] }, (key) => {
            parser.set(key, { defaultValue: '' });
        });

        done();
    },
};

/**
 * Vite config for building the Internal Sport V2 Chat Widget.
 *
 * Produces a single IIFE bundle (sport-chat.js) with:
 * - React + ReactDOM bundled
 * - CSS inlined (via ?inline import)
 * - No external dependencies
 *
 * Usage: npx vite build --config widget/vite.config.widget.ts
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'SportChat',
            formats: ['iife'],
            fileName: () => 'sport-chat.js',
        },
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
        minify: 'esbuild',
        target: 'es2020',
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
});

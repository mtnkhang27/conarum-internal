import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path';

export default defineConfig({
    base: './',
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            // Resolve cap-valuehelp from local sibling workspace for live dev changes
            '@cnma/cap-valuehelp/react/valuehelp.css': path.resolve(__dirname, '../../../cap-valuehelp/react/valuehelp.css'),
            '@cnma/cap-valuehelp/react': path.resolve(__dirname, '../../../cap-valuehelp/dist/react/index.js'),
            '@cnma/cap-identity/react/identity.css': path.resolve(__dirname, '../../../cap-identity/react/identity.css'),
            '@cnma/cap-identity/react': path.resolve(__dirname, '../../../cap-identity/dist/react/index.js'),
        },
        // Prevent duplicate React when external packages resolve from root node_modules
        dedupe: ['react', 'react-dom'],
    },
    // Copy docs to public folder during build
    publicDir: 'public',
    server: {
        proxy: {
            // Proxy API calls to CAP backend
            // Authorization header auto-authenticates as 'admin' against mocked CAP auth
            '/api/cnma': {
                target: 'http://localhost:4004',
                changeOrigin: true,
                headers: { Authorization: 'Basic YWRtaW46' },
            },
            '/browse': {
                target: 'http://localhost:4004',
                changeOrigin: true,
                headers: { Authorization: 'Basic YWRtaW46' },
            },
            '/admin': {
                target: 'http://localhost:4004',
                changeOrigin: true,
                headers: { Authorization: 'Basic YWRtaW46' },
            },
            '/odata': {
                target: 'http://localhost:4004',
                changeOrigin: true,
                secure: false,
                headers: { Authorization: 'Basic YWRtaW46' },
            },
            '/identity-admin': {
                target: 'http://localhost:4004',
                changeOrigin: true,
                headers: { Authorization: 'Basic YWRtaW46' },
            },
            '/identity': {
                target: 'http://localhost:4004',
                changeOrigin: true,
                headers: { Authorization: 'Basic YWRtaW46' },
            }
        }
    }
})

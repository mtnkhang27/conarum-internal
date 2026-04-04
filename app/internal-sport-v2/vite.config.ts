import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path';

export default defineConfig(() => {
    const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:4004';
    const isRemote = proxyTarget.startsWith('https');
    const localAuthHeader = !isRemote
        ? { Authorization: 'Basic ' + Buffer.from('admin:admin').toString('base64') }
        : {};

    return {
        base: './',
        plugins: [
            react(),
            tailwindcss(),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src'),
            },
            dedupe: ['react', 'react-dom'],
        },
        publicDir: 'public',
        server: {
            proxy: {
                '/api': {
                    target: proxyTarget,
                    changeOrigin: true,
                    secure: isRemote,
                    headers: localAuthHeader,
                },
                '/odata': {
                    target: proxyTarget,
                    changeOrigin: true,
                    secure: isRemote,
                    headers: localAuthHeader,
                },
            },
        },
    };
})

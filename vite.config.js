import {defineConfig} from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            // Отключаем авто-обновление для Inertia страниц
            refresh: false,
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
            '@components': path.resolve(__dirname, 'resources/js/Components'),
            '@admin-components': path.resolve(__dirname, 'resources/js/Components/Admin'),
            '@layouts': path.resolve(__dirname, 'resources/js/Layouts'),
            '@admin-layouts': path.resolve(__dirname, 'resources/js/Layouts/Admin'),
            '@pages': path.resolve(__dirname, 'resources/js/Pages'),
            '@admin-pages': path.resolve(__dirname, 'resources/js/Pages/Admin'),
        },
        extensions: ['.js', '.jsx', '.json'],
    },
// Добавляем оптимизацию для MUI
    optimizeDeps: {
        include: [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
        ],
    },
    server: {
        hmr: {
            overlay: false,
        },
        watch: {
            ignored: ['**/vendor/**', '**/storage/**', '**/node_modules/**'],
        },
    },
});

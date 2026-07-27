import {defineConfig} from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react({
            // Явно указываем расширения для обработки JSX
            include: /\.(js|jsx)$/,
            babel: {
                plugins: [
                    ['@babel/plugin-transform-react-jsx', {
                        runtime: 'automatic',
                        throwIfNamespace: false,
                    }]
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': '/resources/js',
            '@components': '/resources/js/Components',
            '@admin-components': '/resources/js/Components/Admin',
            '@layouts': '/resources/js/Layouts',
            '@admin-layouts': '/resources/js/Layouts/Admin',
            '@pages': '/resources/js/Pages',
            '@admin-pages': '/resources/js/Pages/Admin',
        },
        extensions: ['.js', '.jsx', '.json'],
    },
    optimizeDeps: {
        esbuild: {
            loader: {
                '.js': 'jsx',
            },
        },
    },
    esbuild: {
        loader: 'jsx',
        include: /\.js$/,
        exclude: [],
    },
});

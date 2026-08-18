import {defineConfig} from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Пакеты TipTap, до которых сборщик НЕ доходит при холодном старте.
 *
 * Почему их нужно перечислять руками:
 * страницы Inertia грузятся через `resolvePageComponent` (import.meta.glob),
 * а сам редактор — через `lazy(() => import('./RichTextEditor/RichTextEditor.jsx'))`.
 * Это двойная динамика: esbuild-сканер Vite обходит статический граф импортов
 * и такие ветки не разворачивает. В результате TipTap впервые «обнаруживается»
 * только в тот момент, когда вы открыли настройку типа «Редактор»:
 * Vite запускает повторную оптимизацию, меняет хеш ?v=... у бандлов —
 * и запрос, уже летящий за старым хешем, получает 504 (Outdated Optimize Dep).
 *
 * Перечисление в optimizeDeps.include пребандлит их на старте,
 * поэтому повторной оптимизации в середине сессии не происходит.
 */
const tiptap = [
    '@tiptap/react',
    '@tiptap/core',
    '@tiptap/starter-kit',
    '@tiptap/extensions',
    '@tiptap/extension-text-style',
    '@tiptap/extension-list',
    '@tiptap/extension-table',
    '@tiptap/extension-image',
    '@tiptap/extension-text-align',
    '@tiptap/extension-highlight',
    // ProseMirror-ядро: TipTap импортирует его подпутями,
    // их тоже стоит зафиксировать явно.
    '@tiptap/pm/state',
    '@tiptap/pm/view',
    '@tiptap/pm/model',
    '@tiptap/pm/transform',
    '@tiptap/pm/commands',
    '@tiptap/pm/keymap',
    '@tiptap/pm/schema-list',
    '@tiptap/pm/tables',
];

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, 'resources/js'),
            '@components': path.resolve(import.meta.dirname, 'resources/js/Components'),
            '@admin-components': path.resolve(import.meta.dirname, 'resources/js/Components/Admin'),
            '@layouts': path.resolve(import.meta.dirname, 'resources/js/Layouts'),
            '@admin-layouts': path.resolve(import.meta.dirname, 'resources/js/Layouts/Admin'),
            '@pages': path.resolve(import.meta.dirname, 'resources/js/Pages'),
            '@admin-pages': path.resolve(import.meta.dirname, 'resources/js/Pages/Admin'),
        },
        extensions: ['.js', '.jsx', '.json'],
        // Страховка от двух копий ядра в node_modules: TipTap проверяет
        // расширения по instanceof/имени, и вторая копия @tiptap/core
        // выдаёт «Duplicate extension names» либо молча ломает команды.
        dedupe: ['@tiptap/core', '@tiptap/pm', 'react', 'react-dom'],
    },
    optimizeDeps: {
        include: [
            ...tiptap,
            // dnd-kit тоже приезжает через lazy-страницы админки
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/modifiers',
            '@dnd-kit/utilities',
            // Добавляем оптимизацию для MUI
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
        ],
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // редактор — отдельным чанком, чтобы не тянуть его
                    // в основной бандл админки
                    tiptap: tiptap.filter((name) => !name.startsWith('@tiptap/pm')),
                },
            },
        },
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

import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import {createRoot} from 'react-dom/client';
import {ThemeProvider, createTheme} from "@mui/material";
import { CssBaseline } from '@mui/material';
import {createContext, useContext, useMemo, useState} from "react";

const appName = import.meta.env.VITE_APP_NAME || 'React19Laravel13';

/*
 * ===========================================================================
 * 1. СОЗДАНИЕ КОНТЕКСТА ТЕМЫ (React Context)
 * ===========================================================================
 * Контекст — это способ передавать данные через дерево компонентов
 * без необходимости передавать пропсы на каждый уровень вручную.
 * Здесь мы создаем контекст для переключения темы.
 * Экспортируем его, чтобы компоненты (например, Header) могли использовать хук useColorMode.
 */
export const ColorModeContext = createContext({
    toggleColorMode: () => {} // Значение по умолчанию (пустая функция)
});

/*
 * ===========================================================================
 * 2. КАСТОМНЫЙ ХУК для удобного использования контекста
 * ===========================================================================
 * Вместо того чтобы в каждом компоненте писать useContext(ColorModeContext),
 * мы создаем свой хук useColorMode().
 * Это делает код чище и предоставляет единую точку доступа к функционалу темы.
 */
export const useColorMode = () => useContext(ColorModeContext);

function App({ children }) { // children — это страница Inertia, обернутая в провайдеры
    /*
     * ===========================================================================
     * 3. СОСТОЯНИЕ ТЕМЫ (useState с ленивой инициализацией)
     * ===========================================================================
     * mode — это строка 'light' или 'dark'.
     * useState(() => { ... }) — ленивая инициализация:
     * функция внутри useState выполнится только ОДИН раз при первом рендере.
     * Это экономит ресурсы, так как мы не читаем localStorage при каждом ререндере.
     */
    const [mode, setMode] = useState(() => {
        try {
            // При загрузке проверяем localStorage: какую тему выбрал юзер в прошлый раз?
            return localStorage.getItem('colorMode') || 'light';
        } catch {
            // Если localStorage недоступен (например, SSR, приватный режим браузера),
            // просто используем светлую тему по умолчанию.
            return 'light';
        }
    });

    /*
     * ===========================================================================
     * 4. МЕМОИЗАЦИЯ КОНТЕКСТА ТЕМЫ (useMemo)
     * ===========================================================================
     * colorMode — это объект с функцией toggleColorMode, который будет передан в контекст.
     * useMemo запоминает этот объект и пересоздает его только при изменении зависимостей
     * (в нашем случае — [], то есть НИКОГДА).
     * Это КРИТИЧЕСКИ ВАЖНО для производительности. Если бы объект создавался заново
     * при каждом рендере App, все компоненты-потребители этого контекста
     * перерендеривались бы без нужды.
     */

    const colorMode = useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode) => {
                    const newMode = prevMode === 'light' ? 'dark' : 'light';
                    try {
                        // Сохраняем новый выбор в localStorage, чтобы тема сохранилась после перезагрузки.
                        localStorage.setItem('colorMode', newMode);
                    } catch {} // Игнорируем ошибки localStorage
                    return newMode; // Возвращаем новое значение для состояния
                });
            },
        }),
        [], // Зависимости пустые: объект контекста стабилен на протяжении всей жизни приложения
    );


    /*
     * ===========================================================================
     * 5. СОЗДАНИЕ ОБЪЕКТА ТЕМЫ MUI (useMemo)
     * ===========================================================================
     * Тема MUI создается с помощью createTheme(). Она определяет цвета,
     * отступы, стили скроллбаров и многое другое.
     * Зависимость [mode] означает, что тема будет пересоздаваться заново
     * при каждом переключении light/dark. Это обеспечивает моментальное
     * обновление интерфейса.
     */
    const theme = useMemo(
        () =>
            createTheme({
                // Настройка палитры (цветов)
                palette: {
                    mode, // Передаем текущую тему ('light' или 'dark'), MUI сам применит базовые цвета
                    primary: { main: mode === 'dark' ? '#90caf9' : '#1976d2' }, // Кастомный синий
                    secondary: { main: mode === 'dark' ? '#f48fb1' : '#dc004e' }, // Кастомный розовый
                    background: {
                        default: mode === 'dark' ? '#121212' : '#f5f5f5', // Фон всего приложения
                        paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',   // Фон карточек, диалогов
                    },
                },
                // Кастомизация внутренних компонентов MUI
                components: {
                    MuiCssBaseline: { // Компонент CssBaseline сбрасывает/нормализует стили браузера
                        styleOverrides: {
                            // Здесь мы переопределяем стили для скроллбаров во ВСЕМ приложении
                            body: {
                                // Стандартный скроллбар для Firefox
                                scrollbarColor: mode === 'dark' ? '#6b6b6b #2b2b2b' : '#959595 #e0e0e0',
                                // Кастомный скроллбар для Chrome/Safari/Edge (через псевдоэлементы)
                                '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                                    backgroundColor: mode === 'dark' ? '#2b2b2b' : '#e0e0e0',
                                    width: 8, // Толщина скроллбара
                                },
                                '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                                    borderRadius: 8, // Скругление ползунка
                                    backgroundColor: mode === 'dark' ? '#6b6b6b' : '#959595', // Цвет ползунка
                                    minHeight: 24, // Минимальная высота ползунка
                                },
                            },
                        },
                    },
                },
            }),
        [mode], // При изменении mode тема полностью пересобирается
    );

    /*
     * ===========================================================================
     * 6. ОБОРАЧИВАНИЕ ДЕРЕВА В ПРОВАЙДЕРЫ
     * ===========================================================================
     * Порядок провайдеров важен: ThemeProvider использует контекст темы,
     * поэтому он вложен.
     * <CssBaseline /> нормализует стили с учетом текущей темы (например, цвет фона body).
     * {children} — это страница, которую рендерит Inertia.
     */

    return (
        <ColorModeContext.Provider value={colorMode}> {/* Даем доступ к переключению темы всем потомкам */}
            <ThemeProvider theme={theme}> {/* Применяем сгенерированную тему MUI */}
                <CssBaseline /> {/* Применяет бейзлайн-стили из темы к body/html */}
                {children} {/* Здесь будет рендериться контент страницы Inertia.js */}
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App: InertiaApp, props }) {
        // Создаём root только один раз
        if (!el._root) {
            el._root = createRoot(el);
        }

        el._root.render(
            <App>
                <InertiaApp {...props} />
            </App>
        );
    },
    progress: {
        color: '#1976d2',
        showSpinner: true,
    },
});

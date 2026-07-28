import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import {createRoot} from 'react-dom/client';
import {ThemeProvider, createTheme} from "@mui/material";
import { CssBaseline } from '@mui/material';
import {createContext, useContext, useMemo, useState} from "react";

const appName = import.meta.env.VITE_APP_NAME || 'React19Laravel13';

// Создаем контекст для темы
export const ColorModeContext = createContext({
    toggleColorMode: () => {}
});

// Хук для использования темы
export const useColorMode = () => useContext(ColorModeContext);

function App({ children }) {
    const [mode, setMode] = useState(() => {
        try {
            return localStorage.getItem('colorMode') || 'light';
        } catch {
            return 'light';
        }
    });

    const colorMode = useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode) => {
                    const newMode = prevMode === 'light' ? 'dark' : 'light';
                    try {
                        localStorage.setItem('colorMode', newMode);
                    } catch {}
                    return newMode;
                });
            },
        }),
        [],
    );

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    primary: { main: mode === 'dark' ? '#90caf9' : '#1976d2' },
                    secondary: { main: mode === 'dark' ? '#f48fb1' : '#dc004e' },
                    background: {
                        default: mode === 'dark' ? '#121212' : '#f5f5f5',
                        paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
                    },
                },
                components: {
                    MuiCssBaseline: {
                        styleOverrides: {
                            body: {
                                scrollbarColor: mode === 'dark' ? '#6b6b6b #2b2b2b' : '#959595 #e0e0e0',
                                '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                                    backgroundColor: mode === 'dark' ? '#2b2b2b' : '#e0e0e0',
                                    width: 8,
                                },
                                '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                                    borderRadius: 8,
                                    backgroundColor: mode === 'dark' ? '#6b6b6b' : '#959595',
                                    minHeight: 24,
                                },
                            },
                        },
                    },
                },
            }),
        [mode],
    );

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}

// Ключевой момент: сохраняем root между вызовами
let root = null;

createInertiaApp({
    title: (title) => title ? `${title} - App` : 'App',
    resolve: (name) => resolvePageComponent(
        `./Pages/${name}.jsx`,
        import.meta.glob('./Pages/**/*.jsx'),
    ),
    setup({ el, App: InertiaApp, props }) {
        if (!root) {
            root = createRoot(el);
        }

        root.render(
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

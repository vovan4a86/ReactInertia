import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { ThemeProvider as ThemeProviderV5 } from '@mui/material/styles';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import {createRoot} from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { StyledEngineProvider } from '@mui/material/styles';
import { LayoutProvider } from '@admin-layouts/context/LayoutContext.jsx';
import {
    ThemeProvider as ThemeChangeProvider,
    ThemeStateContext,
} from '@admin-layouts/context/ThemeContext';
import { ModalProvider } from "@/Contexts/Admin/ModalContext.jsx";
import { DialogProvider } from "@/Contexts/Admin/DialogContext.jsx";
import { LocalNotificationProvider } from "@/Contexts/Admin/LocalNotificationContext.jsx";


const appName = import.meta.env.VITE_APP_NAME || 'React19Laravel13';

function App({ children }) { // children — это страница Inertia, обернутая в провайдеры

    /*
     * ===========================================================================
     * ОБОРАЧИВАНИЕ ДЕРЕВА В ПРОВАЙДЕРЫ
     * ===========================================================================
     * Порядок провайдеров важен:
     * <CssBaseline /> нормализует стили с учетом текущей темы (например, цвет фона body).
     * {children} — это страница, которую рендерит Inertia.
     */

    return (
        <LayoutProvider>
            <StyledEngineProvider injectFirst>
                <ThemeChangeProvider>
                    <ThemeStateContext.Consumer>
                        {(theme) => (
                            <ThemeProviderV5 theme={theme}>
                                <CssBaseline />
                                {children}
                            </ThemeProviderV5>
                        )}
                    </ThemeStateContext.Consumer>
                </ThemeChangeProvider>
            </StyledEngineProvider>
        </LayoutProvider>
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
                <ModalProvider>
                    <DialogProvider>
                        <LocalNotificationProvider>
                            <InertiaApp {...props} />
                        </LocalNotificationProvider>
                    </DialogProvider>
                </ModalProvider>
            </App>
        );
    },
    progress: {
        color: '#1976d2',
        showSpinner: true,
    },
});

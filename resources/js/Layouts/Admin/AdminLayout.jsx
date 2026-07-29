import { useState, createContext, useContext } from 'react';
import {
    Box,
    CssBaseline,
    Toolbar,
    useMediaQuery,
    useTheme,
    Fab,
    IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SettingsIcon from '@mui/icons-material/Settings';
import GithubIcon from '@mui/icons-material/GitHub';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';

// Компоненты вашего шаблона
import AdminHeader from '@admin-components/Header';
import AdminSidebar from '@admin-components/Sidebar';
import AdminFooter from '@admin-components/Footer'; // Предполагаем, что вы его создадите
import Breadcrumbs from '@admin-components/Breadcrumbs'; // Предполагаем, что вы его создадите
import ColorChangeThemePopper from '@admin-components/ColorChangeThemePopper'; // Предполагаем, что вы его создадите
import { Link } from '@admin-components/Wrappers'; // Если используете

const drawerWidth = 260;

/*
 * ===========================================================================
 * 1. СТИЛИЗОВАННЫЙ КОМПОНЕНТ 'main'
 * ===========================================================================
 * Styled Components в MUI (styled('main')) — это способ создать HTML-элемент
 * с переиспользуемыми стилями.
 * shouldForwardProp: (prop) => prop !== 'open' — мы запрещаем передавать
 * проп 'open' в реальный DOM-элемент <main>, чтобы избежать варнингов React
 * о неизвестных атрибутах.
 */
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
    // theme — из MUI ThemeProvider, open — наш кастомный проп
    ({ theme, open }) => ({
        flexGrow: 1,
        padding: theme.spacing(3),
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,

        // ✅ Синхронизированные переходы
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),

        // По умолчанию (сайдбар скрыт)
        width: '100%',
        marginLeft: 0,

        // Когда сайдбар открыт
        ...(open && {
            [theme.breakpoints.up('md')]: {  // Только на экранах больше 'md' (обычно 900px)
                width: `calc(100% - ${drawerWidth}px)`, // Ширина контента минус ширина сайдбара
                marginLeft: `${drawerWidth}px`, // Отступ слева равен ширине сайдбара
            },
            transition: theme.transitions.create(['margin', 'width'], {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
            }),
        }),
    })
);

/*
 * ===========================================================================
 * 2. КОНТЕКСТ ДЛЯ САЙДБАРА
 * ===========================================================================
 * Позволяет любому компоненту (например, Header) узнать, открыт ли сайдбар,
 * и иметь возможность его переключить.
 */
export const SidebarContext = createContext({
    isSidebarOpened: true,
    toggleSidebar: () => {},
});
export const useSidebar = () => useContext(SidebarContext);

export default function AdminLayout({ children, title = 'Admin Panel' }) {
    const theme = useTheme();
    // Хук useMediaQuery подписывается на изменение размера экрана.
    // down('md') означает "все разрешения меньше десктопного (md)".
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Разделяем состояния: одно для мобильного Drawer (временный), другое для десктопа (постоянный)
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopOpen, setDesktopOpen] = useState(true);

    // Вычисляемое свойство: считаем, что сайдбар открыт, только если мы на десктопе
    // и состояние desktopOpen === true. На мобилке "открытость" не влияет на сдвиг контента.
    const isSidebarOpen = !isMobile && desktopOpen;

    // Для поппера смены темы (как в исходном шаблоне)
    const [anchorEl, setAnchorEl] = useState(null);
    const openPopper = Boolean(anchorEl);
    const popperId = openPopper ? 'add-section-popover' : undefined;

    // Универсальный обработчик переключения сайдбара
    const handleDrawerToggle = () => {
        if (isMobile) {
            setMobileOpen(!mobileOpen); // На мобилке переключаем временный Drawer
        } else {
            setDesktopOpen(!desktopOpen); // На десктопе сворачиваем/разворачиваем постоянный
        }
    };

    // Обработчик клика по кнопке смены темы (шестеренка)
    const handleThemePopperClick = (event) => {
        setAnchorEl(openPopper ? null : event.currentTarget);
    };

    // Значение для контекста сайдбара, чтобы использовать в хедере/сайдбаре
    const sidebarContextValue = {
        isSidebarOpened: isSidebarOpen,
        toggleSidebar: handleDrawerToggle,
    };

    return (
        <SidebarContext.Provider value={sidebarContextValue}>
            {/* Основная обертка страницы */}
            <Box component="div"
                 sx={{
                     flexGrow: 1,
                     p: 3,
                     minHeight: '100vh',
                     backgroundColor: 'background.default',
                     transition: theme.transitions.create(['margin', 'width'], {
                         easing: theme.transitions.easing.sharp,
                         duration: theme.transitions.duration.leavingScreen,
                     }),
                     // По умолчанию — без отступа
                     width: '100%',
                     ml: 0,
                     // На десктопе с открытым сайдбаром — с отступом
                     ...(isSidebarOpen && {
                         width: { md: `calc(100% - ${drawerWidth}px)` },
                         ml: { md: `${drawerWidth}px` },
                         transition: theme.transitions.create(['margin', 'width'], {
                             easing: theme.transitions.easing.easeOut,
                             duration: theme.transitions.duration.enteringScreen,
                         }),
                     }),
                 }}
            >
                {/* Шапка: передаем пропсы для управления */}
                <AdminHeader
                    title={title}
                    drawerWidth={drawerWidth}
                    handleDrawerToggle={handleDrawerToggle}
                    open={desktopOpen}
                    isMobile={isMobile}
                />

                {/* Сайдбар: отдельно управляется для мобилки и десктопа */}
                <AdminSidebar
                    drawerWidth={drawerWidth}
                    mobileOpen={mobileOpen}
                    desktopOpen={desktopOpen}
                    handleDrawerToggle={handleDrawerToggle}
                    isMobile={isMobile}
                />

                {/* Main — здесь находится основной контент страницы */}
                <Main>
                    {/* Передаем вычисленное состояние "открытости" */}
                    <Toolbar />

                    {/* Хлебные крошки (можно передавать через props или глобальный стор) */}
                    <Breadcrumbs />

                    {/* СЮДА INERTIA ВСТАВЛЯЕТ СОДЕРЖИМОЕ СТРАНИЦЫ */}
                    {children}

                    {/* Кнопка и поппер для смены темы */}
                    <Fab
                        color="primary"
                        aria-label="settings"
                        onClick={handleThemePopperClick}
                        sx={{
                            position: 'fixed',
                            bottom: 50,
                            right: 16,
                            zIndex: 2000,
                        }}
                    >
                        <SettingsIcon />
                    </Fab>
                    <ColorChangeThemePopper
                        id={popperId}
                        open={openPopper}
                        anchorEl={anchorEl}
                    />

                    {/* Футер */}
                    <AdminFooter>
                        <div>
                            <Link
                                color={'primary'}
                                href={'https://flatlogic.com/'}
                                target={'_blank'}
                                sx={{ textDecoration: 'none', mx: 1 }}
                            >
                                Flatlogic
                            </Link>
                            <Link
                                color={'primary'}
                                href={'https://flatlogic.com/about'}
                                target={'_blank'}
                                sx={{ textDecoration: 'none', mx: 1 }}
                            >
                                About Us
                            </Link>
                            <Link
                                color={'primary'}
                                href={'https://flatlogic.com/blog'}
                                target={'_blank'}
                                sx={{ textDecoration: 'none', mx: 1 }}
                            >
                                Blog
                            </Link>
                        </div>
                        <div>
                            <Link href={'https://www.facebook.com/flatlogic'} target={'_blank'}>
                                <IconButton aria-label="facebook">
                                    <FacebookIcon style={{ color: '#6E6E6E99' }} />
                                </IconButton>
                            </Link>
                            <Link href={'https://twitter.com/flatlogic'} target={'_blank'}>
                                <IconButton aria-label="twitter">
                                    <TwitterIcon style={{ color: '#6E6E6E99' }} />
                                </IconButton>
                            </Link>
                            <Link href={'https://github.com/flatlogic'} target={'_blank'}>
                                <IconButton aria-label="github">
                                    <GithubIcon style={{ color: '#6E6E6E99' }} />
                                </IconButton>
                            </Link>
                        </div>
                    </AdminFooter>
                </Main>
            </Box>
        </SidebarContext.Provider>
    );
}

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

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
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
            [theme.breakpoints.up('md')]: {
                width: `calc(100% - ${drawerWidth}px)`,
                marginLeft: `${drawerWidth}px`,
            },
            transition: theme.transitions.create(['margin', 'width'], {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
            }),
        }),
    })
);

// Контекст для управления сайдбаром (можете вынести в отдельный файл)
export const SidebarContext = createContext({
    isSidebarOpened: true,
    toggleSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export default function AdminLayout({ children, title = 'Admin Panel' }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopOpen, setDesktopOpen] = useState(true);

    const isSidebarOpen = !isMobile && desktopOpen;

    // Для поппера смены темы (как в исходном шаблоне)
    const [anchorEl, setAnchorEl] = useState(null);
    const openPopper = Boolean(anchorEl);
    const popperId = openPopper ? 'add-section-popover' : undefined;

    const handleDrawerToggle = () => {
        if (isMobile) {
            setMobileOpen(!mobileOpen);
        } else {
            setDesktopOpen(!desktopOpen);
        }
    };

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
                {/*<CssBaseline />*/}
                <AdminHeader
                    title={title}
                    drawerWidth={drawerWidth}
                    handleDrawerToggle={handleDrawerToggle}
                    open={desktopOpen}
                    isMobile={isMobile}
                />

                <AdminSidebar
                    drawerWidth={drawerWidth}
                    mobileOpen={mobileOpen}
                    desktopOpen={desktopOpen}
                    handleDrawerToggle={handleDrawerToggle}
                    isMobile={isMobile}
                />

                <Main>
                    {/* Toolbar для отступа, т.к. AppBar фиксированный */}
                    <Toolbar />

                    {/* Хлебные крошки (можно передавать через props или глобальный стор) */}
                    <Breadcrumbs />

                    {/* Содержимое страницы Inertia */}
                    {children}

                    {/* Кнопка и поппер для смены темы */}
                    <Fab
                        color="primary"
                        aria-label="settings"
                        onClick={handleThemePopperClick}
                        sx={{
                            position: 'fixed',
                            bottom: 16,
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

import { useState, createContext, useContext } from 'react';
import {
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

import classnames from 'classnames';

// Компоненты вашего шаблона
import Header from '@admin-components/Header/Header';
import Sidebar from '@admin-components/Sidebar/Sidebar';
import BreadCrumbs from '@admin-components/BreadCrumbs';
import Footer from '@admin-components/Footer/Footer';
import ColorChangeThemePopper from '@admin-layouts/components/ColorChangeThemePopper.jsx';
import { Link } from '@admin-components/Wrappers/Wrappers.jsx';

import useStyles from './styles';
import structure from './structure.jsx';

// context
import { useLayoutState } from './context/LayoutContext';

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
    const classes = useStyles();

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

    let layoutState = useLayoutState();

    const id = open ? 'add-section-popover' : undefined;
    const handleClick = (event) => {
        setAnchorEl(open ? null : event.currentTarget);
    };

    return (
        <SidebarContext.Provider value={sidebarContextValue}>
            {/* Основная обертка страницы */}
            <div className={classes.root}>
                {/* Шапка: передаем пропсы для управления */}
                <Header />

                <Sidebar structure={structure}/>

                <div
                    className={classnames(classes.content, {
                        [classes.contentShift]: layoutState.isSidebarOpened,
                    })}
                >
                    <div className={classes.fakeToolbar} />
                    <BreadCrumbs />

                    {children}

                    <Fab
                        color='primary'
                        aria-label='settings'
                        onClick={(e) => handleClick(e)}
                        className={classes.changeThemeFab}
                        style={{ zIndex: 2000 }}
                    >
                        <SettingsIcon style={{ color: '#fff' }} />
                    </Fab>
                    <ColorChangeThemePopper id={id} open={open} anchorEl={anchorEl} />
                    <Footer>
                        <div>
                            <Link
                                color={'primary'}
                                href={'https://flatlogic.com/'}
                                target={'_blank'}
                                className={classes.link}
                            >
                                Flatlogic
                            </Link>
                            <Link
                                color={'primary'}
                                href={'https://flatlogic.com/about'}
                                target={'_blank'}
                                className={classes.link}
                            >
                                About Us
                            </Link>
                            <Link
                                color={'primary'}
                                href={'https://flatlogic.com/blog'}
                                target={'_blank'}
                                className={classes.link}
                            >
                                Blog
                            </Link>
                        </div>
                        <div>
                            <Link href={'https://www.facebook.com/flatlogic'} target={'_blank'}>
                                <IconButton aria-label='facebook'>
                                    <FacebookIcon style={{ color: '#6E6E6E99' }} />
                                </IconButton>
                            </Link>
                            <Link href={'https://twitter.com/flatlogic'} target={'_blank'}>
                                <IconButton aria-label='twitter'>
                                    <TwitterIcon style={{ color: '#6E6E6E99' }} />
                                </IconButton>
                            </Link>
                            <Link href={'https://github.com/flatlogic'} target={'_blank'}>
                                <IconButton
                                    aria-label='github'
                                    style={{ padding: '12px 0 12px 12px' }}
                                >
                                    <GithubIcon style={{ color: '#6E6E6E99' }} />
                                </IconButton>
                            </Link>
                        </div>
                    </Footer>
                </div>
            </div>
        </SidebarContext.Provider>
    );
}

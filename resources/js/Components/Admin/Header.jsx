import { useState, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    AppBar,
    Toolbar,
    IconButton,
    Menu,
    MenuItem,
    Box,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Person as AccountIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';

import { Typography, Avatar } from './Wrappers';

// Импортируем кастомный хук, который мы создали в AdminLayout.
// Через него получаем доступ к состоянию сайдбара.
import { useSidebar } from '@admin-layouts/AdminLayout';

const defaultAvatar = '/images/logo192.png';

export default function AdminHeader({
                                        title,
                                        drawerWidth,
                                        handleDrawerToggle,
                                        open,
                                        isMobile,
                                        darkMode,
                                        toggleTheme,
                                    }) {
    const theme = useTheme();

    /*
   * ===========================================================================
   * 1. ИСПОЛЬЗОВАНИЕ КОНТЕКСТА САЙДБАРА
   * ===========================================================================
   * Вместо того чтобы пробрасывать isSidebarOpened через 10 пропсов,
   * хук useSidebar() достает эти данные напрямую из контекста.
   */
    const { isSidebarOpened, toggleSidebar } = useSidebar(); // из вашего контекста

    // Получаем данные аутентификации, которые Laravel передает через Inertia
    const { auth } = usePage().props; // пользователь из Laravel Breeze
    const user = auth?.user;

    // Локальное состояние для меню профиля (какой элемент DOM открыл меню)
    const [profileMenu, setProfileMenu] = useState(null);
    const isSmall = useMediaQuery(theme.breakpoints.down('md'));

    // ==================== ОБРАБОТЧИКИ ====================
    const handleSignOut = () => {
        setProfileMenu(null); // Закрываем меню перед выходом
        // Отправляем POST запрос на /logout. Inertia обработает редирект.
        router.post('/logout'); // стандартный маршрут Breeze
    };

    return (
        <AppBar
            position="fixed"
            elevation={1}
            sx={{
                /*
              * ===========================================================================
              * 2. АДАПТИВНАЯ ШИРИНА ХЕДЕРА
              * ===========================================================================
              * Ширина и отступ синхронизированы с контентом в AdminLayout.
              * Если на десктопе сайдбар открыт, хедер сдвигается и сужается.
              */
                width: { md: open && !isMobile ? `calc(100% - ${drawerWidth}px)` : '100%' },
                ml: { md: open && !isMobile ? `${drawerWidth}px` : 0 },
                transition: theme.transitions.create(['width', 'margin'], {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                }),
                backgroundColor: theme.palette.mode === 'dark'
                    ? theme.palette.background.paper
                    : theme.palette.primary.main,
                zIndex: theme.zIndex.drawer + 1, // Чтобы хедер был над сайдбаром
            }}
        >
            <Toolbar>
                {/* Кнопка переключения сайдбара */}
                <IconButton
                    color="inherit"
                    aria-label="toggle sidebar"
                    edge="start"
                    onClick={handleDrawerToggle || toggleSidebar}
                    sx={{ mr: 2 }}
                >
                    {/*
                      * ===========================================================================
                      * 3. ДИНАМИЧЕСКАЯ ИКОНКА БУРГЕРА
                      * ===========================================================================
                      * Логика:
                      * - Если сайдбар открыт на десктопе (isSidebarOpened && !isSmall): показываем стрелку "закрыть"
                      * - Если сайдбар закрыт на мобилке (!isSidebarOpened && isSmall): показываем гамбургер "открыть"
                      */}
                    {(isSidebarOpened && !isSmall) || (!isSidebarOpened && isSmall) ? (
                        <ArrowBackIcon />
                    ) : (
                        <MenuIcon />
                    )}
                </IconButton>

                {/* Заголовок */}
                <Typography variant="h6" weight="medium" sx={{ flexGrow: 0 }}>
                    {title || 'Admin Panel'}
                </Typography>

                {/* Спейсер, расталкивающий контент по краям */}
                <Box sx={{ flexGrow: 1 }} />

                {/* Аватар пользователя */}
                {user && (
                    <>
                        <IconButton
                            color="inherit"
                            aria-controls="profile-menu"
                            aria-haspopup="true"
                            onClick={(e) => setProfileMenu(e.currentTarget)}
                        >
                            <Avatar
                                alt={user.name}
                                src={user.avatar || defaultAvatar}
                            >
                                {user.name?.[0]?.toUpperCase()}
                            </Avatar>
                        </IconButton>

                        <Typography
                            block
                            sx={{ display: 'flex', alignItems: 'center', ml: 1 }}
                        >
                            Hi,&nbsp;
                            <Typography weight="bold">{user.name}</Typography>
                        </Typography>

                        {/* Выпадающее меню профиля */}
                        <Menu
                            id="profile-menu"
                            /*
                           * ===========================================================================
                           * 4. УПРАВЛЕНИЕ ВЫПАДАЮЩИМ МЕНЮ (Menu)
                           * ===========================================================================
                           * open={Boolean(profileMenu)} — меню открыто, если profileMenu не null (т.е. есть anchorEl).
                           * onClose={() => setProfileMenu(null)} — при закрытии сбрасываем состояние.
                           */
                            open={Boolean(profileMenu)}
                            anchorEl={profileMenu}
                            onClose={() => setProfileMenu(null)}
                            disableAutoFocusItem
                            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            PaperProps={{
                                sx: {
                                    mt: 1.5,
                                    minWidth: 180,
                                    '& .MuiMenuItem-root': {
                                        px: 2,
                                        py: 1,
                                        typography: 'body2',
                                        borderRadius: 1,
                                    },
                                },
                            }}
                        >
                            {/* Инфо о пользователе */}
                            <Box sx={{ px: 2.5, py: 1.5 }}>
                                <Typography variant="subtitle2" weight="bold" noWrap>
                                    {user.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" noWrap>
                                    {user.email}
                                </Typography>
                            </Box>

                            {/* Ссылка на профиль */}
                            <MenuItem
                                component={Link}
                                href="/admin/profile"
                                onClick={() => setProfileMenu(null)}
                            >
                                <AccountIcon sx={{ mr: 1.5, fontSize: 20 }} />
                                Profile
                            </MenuItem>

                            {/* Выход */}
                            <MenuItem onClick={handleSignOut} sx={{ color: 'error.main' }}>
                                Sign Out
                            </MenuItem>
                        </Menu>
                    </>
                )}
            </Toolbar>
        </AppBar>
    );
}

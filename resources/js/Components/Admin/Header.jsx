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
    const { isSidebarOpened, toggleSidebar } = useSidebar(); // из вашего контекста
    const { auth } = usePage().props; // пользователь из Laravel Breeze
    const user = auth?.user;

    // локальное состояние
    const [profileMenu, setProfileMenu] = useState(null);
    const isSmall = useMediaQuery(theme.breakpoints.down('md'));

    // ==================== ОБРАБОТЧИКИ ====================
    const handleSignOut = () => {
        setProfileMenu(null);
        router.post('/logout'); // стандартный маршрут Breeze
    };

    return (
        <AppBar
            position="fixed"
            elevation={1}
            sx={{
                width: { md: open && !isMobile ? `calc(100% - ${drawerWidth}px)` : '100%' },
                ml: { md: open && !isMobile ? `${drawerWidth}px` : 0 },
                transition: theme.transitions.create(['width', 'margin'], {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                }),
                backgroundColor: theme.palette.mode === 'dark'
                    ? theme.palette.background.paper
                    : theme.palette.primary.main,
                zIndex: theme.zIndex.drawer + 1,
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
                    {/* Иконка меняется в зависимости от состояния сайдбара */}
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

                {/* Растягивающийся разделитель */}
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

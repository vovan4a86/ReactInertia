import { Link, usePage } from '@inertiajs/react';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    Box,
    useTheme,
    Divider,
    IconButton,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    Settings as SettingsIcon,
    ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';

const menuItems = [
    {
        text: 'Dashboard',
        icon: <DashboardIcon />,
        href: '/admin',
        match: 'admin.dashboard'
    },
    {
        text: 'Users',
        icon: <PeopleIcon />,
        href: '/admin/users',
        match: 'admin.users'
    },
    {
        text: 'Settings',
        icon: <SettingsIcon />,
        href: '/admin/settings',
        match: 'admin.settings'
    },
];

export default function AdminSidebar({
     drawerWidth,
     mobileOpen,
     desktopOpen,
     handleDrawerToggle,
     isMobile
 }) {
    const theme = useTheme();
    const { component: currentRoute } = usePage();

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: [1],
            }}>
                <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
                    Admin Panel
                </Typography>
                {!isMobile && (
                    <IconButton onClick={handleDrawerToggle}>
                        <ChevronLeftIcon />
                    </IconButton>
                )}
            </Toolbar>

            <Divider />

            <List sx={{ flex: 1 }}>
                {menuItems.map((item) => {
                    const isActive = currentRoute?.startsWith(item.match);

                    return (
                        <ListItem key={item.text} disablePadding sx={{ px: 1, py: 0.5 }}>
                            <ListItemButton
                                component={Link}
                                href={item.href}
                                onClick={isMobile ? handleDrawerToggle : undefined}
                                selected={isActive}
                                sx={{
                                    borderRadius: 1,
                                    '&.Mui-selected': {
                                        backgroundColor: theme.palette.mode === 'dark'
                                            ? 'rgba(255, 255, 255, 0.08)'
                                            : theme.palette.action.selected,
                                        borderRight: `3px solid ${theme.palette.primary.main}`,
                                        '&:hover': {
                                            backgroundColor: theme.palette.mode === 'dark'
                                                ? 'rgba(255, 255, 255, 0.12)'
                                                : theme.palette.action.selected,
                                        },
                                    },
                                }}
                            >
                                <ListItemIcon sx={{
                                    minWidth: 40,
                                    color: isActive ? theme.palette.primary.main : 'inherit'
                                }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontSize: 14,
                                        fontWeight: isActive ? 600 : 400,
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );

    return (
        <Box component="nav" sx={{ width: { md: desktopOpen ? drawerWidth : 0 }, flexShrink: 0 }}>
            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                        backgroundColor: theme.palette.background.default,
                    },
                }}
            >
                {drawer}
            </Drawer>

            {/* Desktop drawer */}
            <Drawer
                variant="persistent"
                open={desktopOpen}
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                        backgroundColor: theme.palette.background.default,
                        borderRight: `1px solid ${theme.palette.divider}`,
                    },
                }}
            >
                {drawer}
            </Drawer>
        </Box>
    );
}

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
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    Settings as SettingsIcon,
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
        <Box>
            <Toolbar>
                <Typography variant="h6" noWrap component="div">
                    Admin Panel
                </Typography>
            </Toolbar>
            <List>
                {menuItems.map((item) => {
                    const isActive = currentRoute?.startsWith(item.match);

                    return (
                        <ListItem key={item.text} disablePadding>
                            <ListItemButton
                                component={Link}
                                href={item.href}
                                onClick={isMobile ? handleDrawerToggle : undefined}
                                selected={isActive}
                                sx={{
                                    '&.Mui-selected': {
                                        backgroundColor: theme.palette.action.selected,
                                        borderRight: `3px solid ${theme.palette.primary.main}`,
                                    },
                                    '&.Mui-selected:hover': {
                                        backgroundColor: theme.palette.action.selected,
                                    },
                                }}
                            >
                                <ListItemIcon>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );

    return (
        <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
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
                        width: drawerWidth
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
                        width: drawerWidth
                    },
                }}
            >
                {drawer}
            </Drawer>
        </Box>
    );
}

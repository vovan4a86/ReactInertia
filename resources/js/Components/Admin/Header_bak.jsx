import { AppBar, Toolbar, IconButton, Typography, Box, useTheme } from '@mui/material';
import {
    Menu as MenuIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon
} from '@mui/icons-material';

export default function AdminHeader({
                                        title,
                                        drawerWidth,
                                        handleDrawerToggle,
                                        open,
                                        isMobile,
                                        darkMode,
                                        toggleTheme
                                    }) {
    const theme = useTheme();
    const isDrawerOpen = open && !isMobile;

    return (
        <AppBar
            position="fixed"
            elevation={1}
            sx={{
                width: { md: isDrawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
                ml: { md: isDrawerOpen ? `${drawerWidth}px` : 0 },
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
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={handleDrawerToggle}
                    sx={{ mr: 2 }}
                >
                    <MenuIcon />
                </IconButton>

                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                    {title}
                </Typography>

                {/*<IconButton color="inherit" onClick={toggleTheme}>*/}
                {/*    {darkMode ? <LightModeIcon /> : <DarkModeIcon />}*/}
                {/*</IconButton>*/}
            </Toolbar>
        </AppBar>
    );
}

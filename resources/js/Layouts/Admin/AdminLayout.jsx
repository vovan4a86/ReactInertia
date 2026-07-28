import { useState } from 'react';
import {
    Box,
    CssBaseline,
    Toolbar,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AdminHeader from '../../Components/Admin/Header';
import AdminSidebar from '../../Components/Admin/Sidebar';
import {useColorMode} from "@/app.jsx";

const drawerWidth = 260;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    minHeight: '100vh',
    backgroundColor: theme.palette.background.default,
    transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    width: '100%',
    ...(open && {
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
        [theme.breakpoints.up('md')]: {
        //     marginLeft: `${drawerWidth}px`,
            width: `calc(100% - ${drawerWidth}px)`,
        },
    }),
}));

export default function AdminLayout({ children, title = 'Admin Panel' }) {
    const theme = useTheme();
    const { toggleColorMode } = useColorMode();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopOpen, setDesktopOpen] = useState(true);

    const handleDrawerToggle = () => {
        if (isMobile) {
            setMobileOpen(!mobileOpen);
        } else {
            setDesktopOpen(!desktopOpen);
        }
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <AdminHeader
                title={title}
                drawerWidth={drawerWidth}
                handleDrawerToggle={handleDrawerToggle}
                open={desktopOpen}
                isMobile={isMobile}
                darkMode={theme.palette.mode === 'dark'}
                toggleTheme={toggleColorMode}
            />

            <AdminSidebar
                drawerWidth={drawerWidth}
                mobileOpen={mobileOpen}
                desktopOpen={desktopOpen}
                handleDrawerToggle={handleDrawerToggle}
                isMobile={isMobile}
            />

            <Main open={desktopOpen && !isMobile}>
                <Toolbar />
                {children}
            </Main>
        </Box>
    );
}


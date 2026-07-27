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

const drawerWidth = 260;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        flexGrow: 1,
        padding: theme.spacing(3),
        minHeight: '100vh',
        backgroundColor: theme.palette.grey[50],
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        marginLeft: 0,
        ...(open && {
            transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
            }),
            marginLeft: 0,
            [theme.breakpoints.up('md')]: {
                marginLeft: `${drawerWidth}px`,
            },
        }),
    }),
);

export default function AdminLayout({ children, title = 'Admin Panel' }) {
    const theme = useTheme();
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
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />

            <AdminHeader
                title={title}
                drawerWidth={drawerWidth}
                handleDrawerToggle={handleDrawerToggle}
                open={desktopOpen}
            />

            <AdminSidebar
                drawerWidth={drawerWidth}
                mobileOpen={mobileOpen}
                desktopOpen={desktopOpen}
                handleDrawerToggle={handleDrawerToggle}
                isMobile={isMobile}
            />

            <Main open={desktopOpen && !isMobile}>
                <Toolbar /> {/* Spacer for fixed header */}
                {children}
            </Main>
        </Box>
    );
}

import { useState, useEffect, useMemo } from 'react';
import { ArrowBack as ArrowBackIcon, ExpandLess, ExpandMore } from '@mui/icons-material';
import {
    Drawer,
    IconButton,
    List,
    Divider,
    Box,
    ListItem,
    Tooltip,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Collapse,
} from '@mui/material';
import { useTheme } from '@mui/material';
import classNames from 'classnames';

// styles
import useStyles from './styles';

// components
import SidebarLink from './components/SidebarLink/SidebarLink';

// context
import {
    useLayoutState,
    useLayoutDispatch,
    toggleSidebar,
} from '@admin-layouts/context/LayoutContext';

function Sidebar({
                     config,
                     collapsed,
                     onToggle,
                     expandedGroups,
                     onToggleGroup,
                     isActive,
                     mobileOpen = false,
                     onMobileClose,
                 }) {
    const classes = useStyles();
    const theme = useTheme();

    const { isSidebarOpened } = useLayoutState();
    const layoutDispatch = useLayoutDispatch();

    const [isPermanent, setPermanent] = useState(true);

    // Синхронизируем LayoutContext с состоянием collapsed
    useEffect(() => {
        if (collapsed === isSidebarOpened) {
            toggleSidebar(layoutDispatch);
        }
    }, []); // Только при монтировании

    // Используем оба состояния для определения, свёрнут ли сайдбар
    const isCollapsed = !isSidebarOpened;

    useEffect(() => {
        const handleWindowWidthChange = () => {
            const windowWidth = window.innerWidth;
            const breakpointWidth = theme.breakpoints.values.md;
            const isSmallScreen = windowWidth < breakpointWidth;

            if (isSmallScreen && isPermanent) {
                setPermanent(false);
            } else if (!isSmallScreen && !isPermanent) {
                setPermanent(true);
            }
        };

        window.addEventListener('resize', handleWindowWidthChange);
        handleWindowWidthChange();

        return () => {
            window.removeEventListener('resize', handleWindowWidthChange);
        };
    }, [isPermanent, theme.breakpoints.values.md]);

    const toggleDrawer = (value) => (event) => {
        if (
            event.type === 'keydown' &&
            (event.key === 'Tab' || event.key === 'Shift')
        ) {
            return;
        }

        if (value && !isPermanent) toggleSidebar(layoutDispatch);
    };

    const renderItem = (item, nested = false) => {
        if (item.divider) {
            return <Divider key={item.id} sx={{ my: 1 }} />;
        }

        const active = isActive(item);
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedGroups.includes(item.id);

        if (hasChildren) {
            return (
                <Box key={item.id}>
                    <ListItem disablePadding>
                        <Tooltip
                            title={isCollapsed ? item.label : ''}
                            placement="right"
                            arrow
                            disableHoverListener={!isCollapsed}
                        >
                            <ListItemButton
                                onClick={() => onToggleGroup(item.id)}
                                sx={{
                                    minHeight: 48,
                                    justifyContent: isCollapsed ? 'center' : 'initial',
                                    px: 2.5,
                                    bgcolor: active ? 'action.selected' : 'transparent',
                                    '&:hover': {
                                        bgcolor: active ? 'action.selected' : 'action.hover',
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: isCollapsed ? 0 : 2,
                                        justifyContent: 'center',
                                        color: active ? 'primary.main' : 'inherit',
                                    }}
                                >
                                    <item.icon />
                                </ListItemIcon>

                                {!isCollapsed && (
                                    <>
                                        <ListItemText
                                            primary={item.label}
                                            sx={{
                                                '& .MuiTypography-root': {
                                                    fontSize: 14,
                                                    fontWeight: active ? 600 : 400,
                                                },
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                ml: 1,
                                            }}
                                        >
                                            {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                        </Box>
                                    </>
                                )}
                            </ListItemButton>
                        </Tooltip>
                    </ListItem>

                    <Collapse in={isExpanded && !isCollapsed} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {item.children.map((child) =>
                                renderItem({ ...child, nested: true })
                            )}
                        </List>
                    </Collapse>
                </Box>
            );
        }

        return (
            <SidebarLink
                key={item.id}
                item={item}
                collapsed={isCollapsed}
                active={active}
                nested={nested}
                onMobileClose={onMobileClose}
            />
        );
    };

    return (
        <Drawer
            variant={isPermanent ? 'permanent' : 'temporary'}
            className={classNames(classes.drawer, {
                [classes.drawerOpen]: !isCollapsed,
                [classes.drawerClose]: isCollapsed,
            })}
            classes={{
                paper: classNames({
                    [classes.drawerOpen]: !isCollapsed,
                    [classes.drawerClose]: isCollapsed,
                }),
            }}
            open={isPermanent ? true : !isCollapsed}
            onClose={toggleDrawer(true)}
        >
            <div className={classes.toolbar} />
            <div className={classes.mobileBackButton}>
                <IconButton onClick={onToggle}>
                    <ArrowBackIcon
                        classes={{
                            root: classNames(classes.headerIcon, classes.headerIconCollapse),
                        }}
                    />
                </IconButton>
            </div>
            <List
                className={classes.sidebarList}
                classes={{ padding: classes.padding }}
            >
                {config.map((item) => renderItem(item))}
            </List>
        </Drawer>
    );
}

export default Sidebar;

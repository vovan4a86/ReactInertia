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

    const isSidebarOpenedWrapper = useMemo(
        () => (!isPermanent ? !isSidebarOpened : isSidebarOpened),
        [isPermanent, isSidebarOpened]
    );

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
                        <Tooltip title={collapsed ? item.label : ''} placement="right" arrow>
                            <ListItemButton
                                onClick={() => onToggleGroup(item.id)}
                                sx={{
                                    minHeight: 48,
                                    justifyContent: collapsed ? 'center' : 'initial',
                                    px: 2.5,
                                    bgcolor: active ? 'action.selected' : 'transparent',
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: collapsed ? 0 : 2,
                                        justifyContent: 'center',
                                        color: active ? 'primary.main' : 'inherit',
                                    }}
                                >
                                    <item.icon />
                                </ListItemIcon>

                                <ListItemText
                                    primary={item.label}
                                    sx={{
                                        opacity: collapsed ? 0 : 1,
                                        width: collapsed ? 0 : 'auto',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                        transition: 'opacity 0.2s, width 0.2s',
                                        '& .MuiTypography-root': {
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        },
                                    }}
                                />

                                <Box
                                    sx={{
                                        opacity: collapsed ? 0 : 1,
                                        width: collapsed ? 0 : 'auto',
                                        overflow: 'hidden',
                                        transition: 'opacity 0.2s, width 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                </Box>
                            </ListItemButton>
                        </Tooltip>
                    </ListItem>

                    <Collapse
                        in={isExpanded && !collapsed}
                        timeout="auto"
                        unmountOnExit
                    >
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
                collapsed={collapsed}
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
                [classes.drawerOpen]: isSidebarOpenedWrapper,
                [classes.drawerClose]: !isSidebarOpenedWrapper,
            })}
            classes={{
                paper: classNames({
                    [classes.drawerOpen]: isSidebarOpenedWrapper,
                    [classes.drawerClose]: !isSidebarOpenedWrapper,
                }),
            }}
            open={isSidebarOpenedWrapper}
            onClose={toggleDrawer(true)}
        >
            <div className={classes.toolbar} />
            <div className={classes.mobileBackButton}>
                <IconButton onClick={() => toggleSidebar(layoutDispatch)}>
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

import React from 'react';
import { ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import { Link } from '@inertiajs/react';
import { Box } from '@mui/material';

function SidebarLink({ item, collapsed, active, nested, onMobileClose }) {
    return (
        <ListItem disablePadding>
            <Tooltip
                title={collapsed ? item.label : ''}
                placement="right"
                arrow
                disableHoverListener={!collapsed}
            >
                <ListItemButton
                    component={Link}
                    href={item.link}
                    sx={{
                        minHeight: 48,
                        justifyContent: collapsed ? 'center' : 'initial',
                        px: 2.5,
                        pl: !collapsed && nested ? 4 : 2.5,
                        bgcolor: active ? 'primary.light' : 'transparent',
                        color: active ? 'primary.contrastText' : 'inherit',
                        '&:hover': {
                            bgcolor: active ? 'primary.main' : 'action.hover',
                        },
                        transition: 'all 0.2s',
                    }}
                    onClick={onMobileClose}
                >
                    <ListItemIcon
                        sx={{
                            minWidth: 0,
                            mr: collapsed ? 'auto' : 2,
                            justifyContent: 'center',
                            color: active ? 'primary.contrastText' : 'inherit',
                        }}
                    >
                        {item.icon ? (
                            <item.icon />
                        ) : (
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: 'currentColor',
                                }}
                            />
                        )}
                    </ListItemIcon>

                    {!collapsed && (
                        <ListItemText
                            primary={item.label}
                            sx={{
                                '& .MuiTypography-root': {
                                    fontSize: 14,
                                    fontWeight: active ? 600 : 400,
                                },
                            }}
                        />
                    )}
                </ListItemButton>
            </Tooltip>
        </ListItem>
    );
}

export default SidebarLink;

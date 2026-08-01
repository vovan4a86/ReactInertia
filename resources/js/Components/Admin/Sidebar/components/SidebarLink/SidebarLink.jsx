import { ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import { Link } from '@inertiajs/react';
import { Box } from '@mui/material';

function SidebarLink({ item, collapsed, active, nested, onMobileClose }) {
    return (
        <ListItem disablePadding>
            <Tooltip title={collapsed ? item.label : ''} placement="right" arrow>
                <ListItemButton
                    component={Link}
                    href={item.link}
                    sx={{
                        minHeight: 48,
                        justifyContent: collapsed ? 'center' : 'initial',
                        px: 2.5,
                        pl: nested ? 4 : 2.5,
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
                            mr: collapsed ? 0 : 2,
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
                </ListItemButton>
            </Tooltip>
        </ListItem>
    );
}

export default SidebarLink;

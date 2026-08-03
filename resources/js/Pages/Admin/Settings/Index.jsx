import React, { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import {
    Box,
    Grid,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemButton,
    Typography,
    TextField,
    IconButton,
    Button,
    Alert,
    Snackbar,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import SettingsFields from './SettingsFields';
import AdminLayout from '@admin-layouts/AdminLayout';

export default function SettingsIndex() {
    const { groups, activeGroup, settings, flash } = usePage().props;
    const [editingGroup, setEditingGroup] = useState(null);
    const [groupName, setGroupName] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success',
    });

    useEffect(() => {
        if (flash?.success) {
            setSnackbar({
                open: true,
                message: flash.success,
                severity: 'success'
            });
        }
        if (flash?.error) {
            setSnackbar({
                open: true,
                message: flash.error,
                severity: 'error'
            });
        }
    }, [flash]);

    const handleGroupClick = (groupId) => {
        router.get(`/admin/settings/group/${groupId}/items`);
    };

    const handleCreateGroup = () => {
        if (!newGroupName.trim()) return;

        router.post('/admin/settings/group',
            { name: newGroupName },
            {
                onSuccess: () => {
                    setNewGroupName('');
                    setSnackbar({
                        open: true,
                        message: 'Группа создана',
                        severity: 'success',
                    });
                },
                onError: (errors) => {
                    setSnackbar({
                        open: true,
                        message: errors.name || 'Ошибка при создании группы',
                        severity: 'error',
                    });
                },
            }
        );
    };

    const handleStartEditGroup = (group) => {
        setEditingGroup(group.id);
        setGroupName(group.name);
    };

    const handleUpdateGroup = (groupId) => {
        if (!groupName.trim()) return;

        router.put(`/admin/settings/group/${groupId}`,
            { name: groupName },
            {
                onSuccess: () => {
                    setEditingGroup(null);
                    setSnackbar({
                        open: true,
                        message: 'Группа обновлена',
                        severity: 'success',
                    });
                },
                onError: (errors) => {
                    setSnackbar({
                        open: true,
                        message: errors.name || 'Ошибка при обновлении группы',
                        severity: 'error',
                    });
                },
            }
        );
    };

    const handleCancelEdit = () => {
        setEditingGroup(null);
        setGroupName('');
    };

    const handleDeleteGroup = (groupId) => {
        if (!confirm('Удалить группу и все настройки?')) return;

        router.delete(`/admin/settings/group/${groupId}`, {
            onSuccess: () => {
                setSnackbar({
                    open: true,
                    message: 'Группа удалена',
                    severity: 'success',
                });
            },
            onError: (errors) => {
                setSnackbar({
                    open: true,
                    message: 'Ошибка при удалении группы',
                    severity: 'error',
                });
            },
        });
    };

    const handleSaveSettings = (formData) => {
        formData.append('setting_group_id', activeGroup?.id);

        router.post('/admin/settings/save', formData, {
            forceFormData: true,
            onSuccess: () => {
                setSnackbar({
                    open: true,
                    message: 'Изменения сохранены',
                    severity: 'success'
                });
            },
            onError: (errors) => {
                setSnackbar({
                    open: true,
                    message: 'Ошибка при сохранении',
                    severity: 'error'
                });
                console.log(errors);
            },
        });
    };

    const handleSnackbarClose = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <AdminLayout>
            <Box>
            <Grid container spacing={3}>
                {/* Groups Sidebar */}
                <Grid item size={{ xs:12, md:3 }} >
                    <Paper sx={{ height: '100%' }}>
                        {/* Header */}
                        <Box sx={{
                            p: 2,
                            borderBottom: 1,
                            borderColor: 'divider',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <Typography variant="h6">Группы</Typography>
                        </Box>

                        {/* Groups List */}
                        <List sx={{
                            maxHeight: 'calc(100vh - 300px)',
                            overflow: 'auto',
                            '& .MuiListItem-root': {
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                            },
                        }}>
                            {groups && groups.length > 0 ? (
                                groups.map((group) => (
                                    <ListItem
                                        key={group.id}
                                        disablePadding
                                        secondaryAction={
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleStartEditGroup(group)}
                                                    sx={{
                                                        color: 'primary.main',
                                                        '&:hover': { bgcolor: 'action.hover' },
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDeleteGroup(group.id)}
                                                    sx={{
                                                        color: 'error.main',
                                                        '&:hover': { bgcolor: 'error.lighter' },
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        }
                                    >
                                        {editingGroup === group.id ? (
                                            <Box sx={{ px: 2, py: 1, width: '100%' }}>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    value={groupName}
                                                    onChange={(e) => setGroupName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleUpdateGroup(group.id);
                                                        } else if (e.key === 'Escape') {
                                                            handleCancelEdit();
                                                        }
                                                    }}
                                                    onBlur={handleCancelEdit}
                                                    autoFocus
                                                    placeholder="Название группы"
                                                />
                                            </Box>
                                        ) : (
                                            <ListItemButton
                                                selected={activeGroup?.id === group.id}
                                                onClick={() => handleGroupClick(group.id)}
                                                sx={{ pr: 8 }}
                                            >
                                                <ListItemText
                                                    primary={group.name}
                                                    primaryTypographyProps={{
                                                        fontWeight: activeGroup?.id === group.id ? 600 : 400,
                                                    }}
                                                />
                                            </ListItemButton>
                                        )}
                                    </ListItem>
                                ))
                            ) : (
                                <ListItem>
                                    <ListItemText
                                        primary="Нет групп"
                                        primaryTypographyProps={{
                                            color: 'textSecondary',
                                            textAlign: 'center',
                                        }}
                                    />
                                </ListItem>
                            )}
                        </List>

                        {/* Create Group Input */}
                        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Название группы..."
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCreateGroup();
                                    }
                                }}
                                InputProps={{
                                    endAdornment: (
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={handleCreateGroup}
                                            disabled={!newGroupName.trim()}
                                        >
                                            <AddIcon />
                                        </IconButton>
                                    ),
                                }}
                            />
                        </Box>
                    </Paper>
                </Grid>

                {/* Settings Content */}
                <Grid item size={{ xs:12, md:9 }}>
                    {activeGroup ? (
                        <Paper>
                            {/* Group Header */}
                            <Box sx={{
                                p: 2,
                                borderBottom: 1,
                                borderColor: 'divider',
                                bgcolor: 'grey.50',
                            }}>
                                <Typography variant="h6" color="textSecondary">
                                    {activeGroup.name}
                                </Typography>
                                {activeGroup.description && (
                                    <Typography
                                        variant="body2"
                                        color="textSecondary"
                                        sx={{ mt: 1 }}
                                    >
                                        {activeGroup.description}
                                    </Typography>
                                )}
                            </Box>

                            {/* Add Setting Button */}
                            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    href={`/admin/settings/edit?setting_group_id=${activeGroup.id}`}
                                >
                                    Добавить настройку
                                </Button>
                            </Box>

                            {/* Settings Fields */}
                            {settings && settings.length > 0 ? (
                                <SettingsFields
                                    settings={settings}
                                    onSave={handleSaveSettings}
                                />
                            ) : (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography color="textSecondary">
                                        Нет настроек в этой группе. Добавьте новую настройку.
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    ) : (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="textSecondary">
                                {groups && groups.length > 0
                                    ? 'Выберите группу слева для просмотра настроек'
                                    : 'Создайте группу настроек для начала работы'}
                            </Typography>
                        </Paper>
                    )}
                </Grid>
            </Grid>
        </Box>
        </AdminLayout>
    );
}

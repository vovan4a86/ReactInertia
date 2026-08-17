import React, {useCallback, useState, useEffect} from 'react';
import {Head, router, usePage} from '@inertiajs/react';
import {
    Box,
    Button,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import SettingsFields from './SettingsFields';
import AdminLayout from '@admin-layouts/AdminLayout';
import {useModal} from '@/Contexts/Admin/ModalContext.jsx';
import {useDialog} from '@/Contexts/Admin/DialogContext.jsx';
import ModalRenderer from "@/Components/Admin/Modal/ModalRenderer.jsx";

/**
 * Страница управления настройками: слева группы, справа значения.
 */
export default function SettingsIndex() {
    const {groups = [], activeGroup, settings = [], modalData} = usePage().props;

    const [editingGroupId, setEditingGroupId] = useState(null);
    const [groupName, setGroupName] = useState('');
    const [newGroupName, setNewGroupName] = useState('');

    const {openModal, setModalFromProps} = useModal();
    const {confirm} = useDialog();

    // Модалка полностью управляется сервером через проп modalData
    useEffect(() => {
        setModalFromProps(modalData ?? null);
    }, [modalData, setModalFromProps]);

    /**
     * Сохранение значений настроек.
     * Возвращаем Promise, чтобы форма корректно показывала индикатор
     */
    const handleSaveSettings = useCallback(
        (formData) =>
            new Promise((resolve) => {
                router.post(route('admin.settings.save'), formData, {
                    forceFormData: true,
                    preserveScroll: true,
                    // после сохранения сервер вернёт актуальные value/file_urls
                    onFinish: resolve,
                });
            }),
        [],
    );

    const handleGroupClick = useCallback((groupId) => {
        router.get(
            route('admin.settings.groupItems', groupId),
            {},
            {
                preserveScroll: true,
                preserveState: false,
            }
        );
    }, [])

    const handleCreateGroup = useCallback(() => {
        const name = newGroupName.trim();
        if (!name) return;

        router.post(
            route('admin.settings.group.store'),
            { name }, {
                preserveScroll: true,
                onSuccess: () => setNewGroupName(''),
            });
    }, [newGroupName]);

    const handleUpdateGroup = useCallback(
        (groupId) => {
            const name = groupName.trim();
            if (!name) return;

            router.put(route('admin.settings.group.update', groupId), { name }, {
                preserveScroll: true,
                onSuccess: () => setEditingGroupId(null),
            });
        },
        [groupName],
    );

    const handleDeleteGroup = useCallback(
        async (groupId) => {
            const confirmed = await confirm({
                title: 'Удаление группы',
                message: 'Удалить группу вместе со всеми настройками и файлами? Действие необратимо.',
                confirmText: 'Удалить',
                cancelText: 'Отмена',
                confirmColor: 'error',
            });

            if (!confirmed) return;

            router.delete(route('admin.settings.group.delete', groupId), { preserveScroll: true });
        },
        [confirm],
    );

    const handleAddSetting = useCallback(() => {
        if (activeGroup?.id) {
            openModal(route('admin.settings.edit', { setting_group_id: activeGroup.id }));
        }
    }, [activeGroup?.id, openModal]);


    return (
        <AdminLayout>
            <Head title="Настройки" />

            <Grid container spacing={3}>
                {/* Группы */}
                <Grid size={{ xs: 12, md: 3 }}>
                    <Paper>
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="h6">Группы</Typography>
                        </Box>

                        <List
                            sx={{
                                maxHeight: 'calc(100vh - 300px)',
                                overflow: 'auto',
                                '& .MuiListItem-root': { borderBottom: 1, borderColor: 'divider' },
                            }}
                        >
                            {groups.length > 0 ? (
                                groups.map((group) => (
                                    <ListItem
                                        key={group.id}
                                        disablePadding
                                        secondaryAction={
                                            editingGroupId === group.id ? null : (
                                                <Stack direction="row" spacing={0.5}>
                                                    <Tooltip title="Переименовать">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => {
                                                                setEditingGroupId(group.id);
                                                                setGroupName(group.name);
                                                            }}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Удалить группу">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDeleteGroup(group.id)}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            )
                                        }
                                    >
                                        {editingGroupId === group.id ? (
                                            <Box sx={{ px: 2, py: 1, width: '100%' }}>
                                                <TextField
                                                    fullWidth
                                                    autoFocus
                                                    size="small"
                                                    value={groupName}
                                                    placeholder="Название группы"
                                                    onChange={(event) => setGroupName(event.target.value)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter') handleUpdateGroup(group.id);
                                                        if (event.key === 'Escape') setEditingGroupId(null);
                                                    }}
                                                    // blur через onMouseDown кнопки «сохранить» не теряем
                                                    onBlur={() => handleUpdateGroup(group.id)}
                                                />
                                            </Box>
                                        ) : (
                                            <ListItemButton
                                                selected={activeGroup?.id === group.id}
                                                onClick={() => handleGroupClick(group.id)}
                                                sx={{ pr: 9 }}
                                            >
                                                <ListItemText
                                                    primary={group.name}
                                                    slotProps={{
                                                        primary: {
                                                            fontWeight: activeGroup?.id === group.id ? 600 : 400,
                                                        },
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
                                        slotProps={{ primary: { color: 'text.secondary', textAlign: 'center' } }}
                                    />
                                </ListItem>
                            )}
                        </List>

                        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Название группы…"
                                value={newGroupName}
                                onChange={(event) => setNewGroupName(event.target.value)}
                                onKeyDown={(event) => event.key === 'Enter' && handleCreateGroup()}
                                slotProps={{
                                    input: {
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
                                    },
                                }}
                            />
                        </Box>
                    </Paper>
                </Grid>

                {/* Настройки */}
                <Grid size={{ xs: 12, md: 9 }}>
                    {activeGroup ? (
                        <Paper>
                            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                <Typography variant="h6">{activeGroup.name}</Typography>
                                {activeGroup.description && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {activeGroup.description}
                                    </Typography>
                                )}
                            </Box>

                            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddSetting}
                                >
                                    Добавить настройку
                                </Button>
                            </Box>

                            {settings.length > 0 ? (
                                <SettingsFields
                                    // ключ по группе: при смене группы форма гарантированно пересоздаётся
                                    key={activeGroup.id}
                                    settings={settings}
                                    groupId={activeGroup.id}
                                    onSave={handleSaveSettings}
                                />
                            ) : (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography color="text.secondary">
                                        В этой группе пока нет настроек.
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    ) : (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                {groups.length > 0
                                    ? 'Выберите группу слева'
                                    : 'Создайте первую группу настроек'}
                            </Typography>
                        </Paper>
                    )}
                </Grid>
            </Grid>

            <ModalRenderer />
        </AdminLayout>
    );
}

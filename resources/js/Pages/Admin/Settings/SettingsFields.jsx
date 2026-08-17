import React, { memo, useCallback } from 'react';
import {router} from '@inertiajs/react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import FieldRenderer from './Fields/FieldRenderer';
import { SettingsFormProvider, useSettingsForm } from './SettingsFormContext';
import {useModal} from "@/Contexts/Admin/ModalContext.jsx";
import {useDialog} from '@/Contexts/Admin/DialogContext.jsx';

/** Заголовок настройки с действиями. */
const SettingHeader = memo(function SettingHeader({ setting, onEdit, onDelete }) {
    return (
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
            <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" fontWeight={500}>
                        {setting.name}
                    </Typography>
                    <Chip label={setting.type_label} size="small" variant="outlined" sx={{ height: 20, fontSize: '.7rem' }} />
                </Stack>
                {setting.code && (
                    <Typography variant="caption" color="text.secondary">
                        Код: {setting.code}
                    </Typography>
                )}
            </Box>

            <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                <Tooltip title="Редактировать настройку">
                    <IconButton size="small" onClick={() => onEdit(setting.id)}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Удалить настройку">
                    <IconButton size="small" color="error" onClick={() => onDelete(setting.id)}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>
        </Stack>
    );
});

/** Внутренняя часть формы — уже внутри провайдера. */
function SettingsFieldsInner() {
    const { settings, values, setValue, submit, processing, hasPendingUploads } = useSettingsForm();
    const { openModal } = useModal();
    const { confirm } = useDialog();

    const handleEdit = useCallback(
        (id) => openModal(route('admin.settings.edit', { id })),
        [openModal],
    );

    const handleDelete = useCallback(
        async (id) => {
            const confirmed = await confirm({
                title: 'Удаление настройки',
                message: 'Удалить настройку и все её значения? Действие необратимо.',
                confirmText: 'Удалить',
                cancelText: 'Отмена',
                confirmColor: 'error',
            });

            if (!confirmed) return;

            router.delete(route('admin.settings.setting.delete', { id }), { preserveScroll: true });
        },
        [confirm],
    );

    const handleSubmit = useCallback(
        (event) => {
            event.preventDefault();
            submit();
        },
        [submit],
    );

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            {settings.map((setting, index) => (
                <React.Fragment key={setting.id}>
                    <Box sx={{ px: 3, py: 2 }}>
                        <SettingHeader setting={setting} onEdit={handleEdit} onDelete={handleDelete} />

                        <Box sx={{ mt: 1 }}>
                            <FieldRenderer
                                setting={setting}
                                value={values[setting.id]}
                                onChange={(value) => setValue(setting.id, value)}
                            />
                        </Box>

                        {setting.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                {setting.description}
                            </Typography>
                        )}
                    </Box>

                    {index < settings.length - 1 && <Divider />}
                </React.Fragment>
            ))}

            <Stack
                direction="row"
                spacing={2}
                justifyContent="flex-end"
                alignItems="center"
                sx={{ p: 2, borderTop: 1, borderColor: 'divider', position: 'sticky', bottom: 0, bgcolor: 'background.paper', zIndex: 1 }}
            >
                {hasPendingUploads && (
                    <Typography variant="caption" color="warning.main">
                        Есть незагруженные файлы — сохраните изменения
                    </Typography>
                )}

                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={processing}
                    startIcon={processing ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                >
                    {processing ? 'Сохранение…' : 'Сохранить'}
                </Button>
            </Stack>
        </Box>
    );
}

/**
 * Форма значений настроек группы.
 *
 * @param {object} props
 * @param {Array}  props.settings
 * @param {number} props.groupId
 * @param {(fd: FormData) => Promise<void>} props.onSave
 */
export default function SettingsFields({ settings = [], groupId, onSave }) {
    if (settings.length === 0) return null;

    return (
        <SettingsFormProvider settings={settings} groupId={groupId} onSave={onSave}>
            <SettingsFieldsInner />
        </SettingsFormProvider>
    );
}

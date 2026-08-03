import React, { useState, useEffect } from 'react';
import { usePage, router } from '@inertiajs/react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Alert,
    Snackbar,
    CircularProgress,
    Divider,
} from '@mui/material';
import {
    Save as SaveIcon,
    ArrowBack as BackIcon,
} from '@mui/icons-material';
import EditParams from './EditParams';
import AdminLayout from '@admin-layouts/AdminLayout';


export default function Edit() {
    const { setting, groups, types, errors: serverErrors, flash } = usePage().props;

    const [formData, setFormData] = useState({
        id: setting?.id || null,
        setting_group_id: setting?.setting_group_id || '',
        code: setting?.code || '',
        type: setting?.type || 0,
        name: setting?.name || '',
        description: setting?.description || '',
        params: setting?.params || {},
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success',
    });

    useEffect(() => {
        if (serverErrors) {
            setErrors(serverErrors);
        }
    }, [serverErrors]);

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

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error for changed field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleTypeChange = (e) => {
        const newType = parseInt(e.target.value);
        handleChange('type', newType);

        // Reset params when type changes
        if (![4, 6].includes(newType)) {
            handleChange('params', {});
        }
    };

    const handleParamsChange = (params) => {
        handleChange('params', params);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        const url = formData.id
            ? `/admin/settings/setting/${formData.id}`
            : '/admin/settings/setting';

        const method = formData.id ? 'put' : 'post';

        router[method](url, formData, {
            onSuccess: () => {
                setLoading(false);
                setSnackbar({
                    open: true,
                    message: formData.id ? 'Настройка обновлена' : 'Настройка создана',
                    severity: 'success',
                });

                // Redirect back to group items if new setting created
                if (!formData.id && formData.group_id) {
                    setTimeout(() => {
                        router.get(`/admin/settings/group/${formData.group_id}/items`);
                    }, 1000);
                }
            },
            onError: (errors) => {
                setLoading(false);
                setErrors(errors);
                setSnackbar({
                    open: true,
                    message: 'Ошибка при сохранении. Проверьте поля формы.',
                    severity: 'error',
                });
                console.log(errors)
            },
        });
    };

    const handleBack = () => {
        if (formData.group_id) {
            router.get(`/admin/settings/group/${formData.group_id}/items`);
        } else {
            router.get('/admin/settings');
        }
    };

    const handleSnackbarClose = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const isNew = !formData.id;
    const showParams = [4, 6].includes(formData.type);

    return (
        <AdminLayout>
            <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Paper>
                {/* Header */}
                <Box sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                }}>
                    <Button
                        size="small"
                        startIcon={<BackIcon />}
                        onClick={handleBack}
                        variant="text"
                    >
                        Назад
                    </Button>
                    <Typography variant="h6">
                        {isNew ? 'Создание настройки' : 'Редактирование настройки'}
                    </Typography>
                </Box>

                {/* Form */}
                <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                        {/* Name */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Название"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                                placeholder="Введите название настройки"
                            />
                        </Grid>

                        {/* Description */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Описание (подсказка)"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                error={!!errors.description}
                                helperText={errors.description}
                                multiline
                                rows={2}
                                placeholder="Описание или подсказка для пользователя"
                            />
                        </Grid>

                        {/* Code and Type */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Системный ключ"
                                value={formData.code}
                                onChange={(e) => handleChange('code', e.target.value)}
                                error={!!errors.code}
                                helperText={errors.code || 'Уникальный ключ для доступа из кода'}
                                required
                                placeholder="Например: site_title"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth error={!!errors.type}>
                                <InputLabel>Тип</InputLabel>
                                <Select
                                    value={formData.type}
                                    onChange={handleTypeChange}
                                    label="Тип"
                                    required
                                >
                                    {Object.entries(types).map(([value, label]) => (
                                        <MenuItem key={value} value={parseInt(value)}>
                                            {label}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.type && (
                                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                                        {errors.type}
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>

                        {/* Group */}
                        <Grid item xs={12}>
                            <FormControl fullWidth error={!!errors.group_id}>
                                <InputLabel>Группа</InputLabel>
                                <Select
                                    value={formData.setting_group_id}
                                    onChange={(e) => handleChange('setting_group_id', e.target.value)}
                                    label="Группа"
                                    required
                                >
                                    {groups.map((group) => (
                                        <MenuItem key={group.id} value={group.id}>
                                            {group.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.group_id && (
                                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                                        {errors.group_id}
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>

                        {/* Type Description */}
                        <Grid item xs={12}>
                            <Alert severity="info" variant="outlined">
                                {getTypeDescription(formData.type)}
                            </Alert>
                        </Grid>

                        {/* Params Section */}
                        {showParams && (
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                                    Параметры полей
                                </Typography>
                                <EditParams
                                    type={formData.type}
                                    params={formData.params}
                                    types={types}
                                    onChange={handleParamsChange}
                                />
                            </Grid>
                        )}
                    </Grid>

                    {/* Actions */}
                    <Box sx={{
                        mt: 4,
                        pt: 2,
                        borderTop: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 2,
                    }}>
                        <Button
                            variant="outlined"
                            onClick={handleBack}
                            disabled={loading}
                        >
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            disabled={loading}
                        >
                            {loading ? 'Сохранение...' : isNew ? 'Создать' : 'Сохранить'}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
        </AdminLayout>
    );
}

// Helper function for type descriptions
function getTypeDescription(type) {
    const descriptions = {
        0: 'Простое текстовое поле для ввода коротких значений.',
        1: 'Многострочное текстовое поле для ввода длинного текста.',
        2: 'Визуальный редактор для форматированного текста (HTML).',
        3: 'Загрузка одного файла (изображение, документ).',
        4: 'Набор полей разных типов, сгруппированных вместе.',
        5: 'Простой список строковых значений.',
        6: 'Таблица с настраиваемыми полями (список объектов).',
        7: 'Галерея изображений с возможностью загрузки нескольких файлов.',
    };

    return descriptions[type] || 'Выберите тип настройки';
}

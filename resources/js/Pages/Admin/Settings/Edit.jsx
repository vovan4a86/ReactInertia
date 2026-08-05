import React, { useState, useEffect } from 'react';
import { usePage, useForm, router } from '@inertiajs/react';
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
    CircularProgress,
    Divider,
} from '@mui/material';
import {
    Save as SaveIcon,
    ArrowBack as BackIcon,
} from '@mui/icons-material';
import EditParams from './EditParams';
import { useModal } from '@/Contexts/Admin/ModalContext.jsx';

export default function Edit({ modalId }) {
    const { closeModal } = useModal();
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

    const { data, setData, post, processing } = useForm({
        id: setting?.id || null,
        setting_group_id: setting?.setting_group_id || '',
        code: setting?.code || '',
        type: setting?.type || 0,
        name: setting?.name || '',
        description: setting?.description || '',
        params: setting?.params || {},
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setData(field, value);

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

        post('/admin/settings/setting', {
            onSuccess: () => {
                closeModal();
            },
        });
    };

    const handleBack = () => {
        e.preventDefault();

        const isNew = !formData.id;
        const url = isNew
            ? '/admin/settings/setting'
            : `/admin/settings/setting/${formData.id}`;
        const method = isNew ? 'post' : 'put';

        router[method](url, formData, {
            onSuccess: (page) => {
                if (page.props.flash?.success) {
                    setSnackbar({
                        open: true,
                        message: page.props.flash.success,
                        severity: 'success'
                    });
                    setTimeout(() => closeModal(), 1000);
                } else {
                    closeModal();
                }
            },
            onError: (errs) => {
                setErrors(errs);
                setSnackbar({
                    open: true,
                    message: 'Ошибка при сохранении',
                    severity: 'error'
                });
            },
        });
    };

    const isNew = !formData.id;
    const showParams = [4, 6].includes(formData.type);

    const getTypeDescription = (type) => {
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
    };

    return (
        <Box sx={{ maxWidth: 800 }}>
            {/* Header */}
            <Box sx={{
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
            }}>
                <Typography variant="h6">
                    {isNew ? 'Создание настройки' : 'Редактирование настройки'}
                </Typography>
            </Box>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit}>
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
                                {types && Object.entries(types).map(([value, label]) => (
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
                        <FormControl fullWidth error={!!errors.setting_group_id}>
                            <InputLabel>Группа</InputLabel>
                            <Select
                                value={formData.setting_group_id}
                                onChange={(e) => handleChange('setting_group_id', e.target.value)}
                                label="Группа"
                                required
                            >
                                {groups && groups.map((group) => (
                                    <MenuItem key={group.id} value={group.id}>
                                        {group.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.setting_group_id && (
                                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                                    {errors.setting_group_id}
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
                            <Typography variant="body2" color="textSecondary">
                                Настройка параметров в разработке...
                            </Typography>
                        </Grid>
                    )}
                </Grid>

                {/* Actions */}
                <Box sx={{
                    mt: 4,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 2,
                }}>
                    <Button
                        variant="outlined"
                        onClick={() => closeModal()}
                        disabled={processing}
                    >
                        Отмена
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={processing ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        disabled={processing}
                    >
                        {processing ? 'Сохранение...' : isNew ? 'Создать' : 'Сохранить'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}

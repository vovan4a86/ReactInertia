import React, {useState } from 'react';
import {router} from '@inertiajs/react';
import {
    Box,
    TextField,
    Button,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Divider,
    CircularProgress,
    Stack,
} from '@mui/material';
import {
    Save as SaveIcon,
} from '@mui/icons-material';
import EditParams from './EditParams';
import {useModal} from '@/Contexts/Admin/ModalContext.jsx';

export default function Edit({setting, groups, types}) {
    const {closeModal} = useModal();

    const [formData, setFormData] = useState({
        id: setting?.id || null,
        setting_group_id: setting?.setting_group_id || '',
        code: setting?.code || '',
        type: setting?.type || 0,
        name: setting?.name || '',
        description: setting?.description || '',
        params: setting?.params || {},
        order: setting?.order ?? 0,
    });

    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({...prev, [field]: value}));

        if (errors[field]) {
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleTypeChange = (e) => {
        const newType = parseInt(e.target.value);
        handleChange('type', newType);

        // Сбрасываем params для всех типов, кроме 4, 6 и 7
        if (![4, 6, 7].includes(newType)) {
            handleChange('params', {});
        }

        // Для типа 7 инициализируем params с полем thumbs, если его нет
        if (newType === 7 && !formData.params?.thumbs) {
            handleChange('params', { thumbs: '' });
        }
    };

    const handleParamsChange = (params) => {
        handleChange('params', params);
    };

    const handleThumbsChange = (value) => {
        handleChange('params', { ...formData.params, thumbs: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setProcessing(true);

        const isNew = !formData.id;
        const url = isNew
            ? '/admin/settings/setting'
            : `/admin/settings/setting/${formData.id}`;
        const method = isNew ? 'post' : 'put';

        const dataToSend = {
            ...formData,
            order: parseInt(formData.order) || 0, // Преобразуем строку в число
        };

        router[method](url, dataToSend, {
            onSuccess: () => {
                setTimeout(() => closeModal(), 1000);
            },
            onError: (errs) => {
                setErrors(errs);
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    const isNew = !formData.id;
    const showParams = [4, 6].includes(formData.type);
    const showGalleryParams = formData.type === 7;

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
        <Box>
            {/* Заголовок */}
            <Typography variant="h6" gutterBottom>
                {isNew ? 'Новая настройка' : 'Редактирование настройки'}
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2.5}>
                    {/* 1) Название + Группа (2:1) */}
                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                        <TextField
                            sx={{flex: 3}}
                            label="Название"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            error={!!errors.name}
                            helperText={errors.name}
                            required
                            placeholder="Введите название настройки"
                            size="small"
                        />
                        <FormControl sx={{flex: 2}} error={!!errors.setting_group_id} size="small">
                            <InputLabel>Группа</InputLabel>
                            <Select
                                value={formData.setting_group_id}
                                onChange={(e) => handleChange('setting_group_id', e.target.value)}
                                label="Группа"
                                variant="outlined"
                                required
                            >
                                {groups && groups.map((group) => (
                                    <MenuItem key={group.id} value={group.id}>
                                        {group.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.setting_group_id && (
                                <Typography variant="caption" color="error">
                                    {errors.setting_group_id}
                                </Typography>
                            )}
                        </FormControl>
                        <TextField
                            sx={{flex: 1}}
                            label="Порядок"
                            value={formData.order}
                            error={!!errors.order}
                            onChange={(e) => handleChange('order', e.target.value)}
                            helperText={errors.order}
                            size="small"
                            slotProps={{
                                htmlInput: {
                                    maxLength: 2,
                                    inputMode: 'numeric'
                                }
                            }}
                            type="text"
                        />
                    </Stack>

                    {/* 2) Описание — одна строка */}
                    <TextField
                        fullWidth
                        label="Описание (подсказка)"
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        error={!!errors.description}
                        helperText={errors.description}
                        size="small"
                        placeholder="Краткое описание или подсказка для пользователя"
                    />

                    {/* 3) Системный ключ + Тип (1:1) */}
                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                        <TextField
                            sx={{flex: 1}}
                            label="Системный ключ"
                            value={formData.code}
                            onChange={(e) => handleChange('code', e.target.value)}
                            error={!!errors.code}
                            helperText={errors.code || 'Уникальный ключ для доступа из кода'}
                            required
                            placeholder="Например: site_title"
                            size="small"
                        />
                        <FormControl sx={{flex: 1}} error={!!errors.type} size="small">
                            <InputLabel>Тип</InputLabel>
                            <Select
                                value={formData.type}
                                onChange={handleTypeChange}
                                label="Тип"
                                variant="outlined"
                                required
                            >
                                {types && Object.entries(types).map(([value, label]) => (
                                    <MenuItem key={value} value={parseInt(value)}>
                                        {label}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.type && (
                                <Typography variant="caption" color="error">
                                    {errors.type}
                                </Typography>
                            )}
                        </FormControl>
                    </Stack>

                    {/* 4) Описание типа */}
                    <Alert severity="info" variant="outlined" sx={{'& .MuiAlert-message': {fontSize: '0.875rem'}}}>
                        {getTypeDescription(formData.type)}
                    </Alert>

                    {/* Параметры для галереи (тип 7) */}
                    {showGalleryParams && (
                        <>
                            <Divider />
                            <Typography variant="subtitle2" color="text.secondary">
                                Параметры галереи
                            </Typography>
                            <TextField
                                fullWidth
                                label="Thumbs"
                                value={formData.params?.thumbs || ''}
                                onChange={(e) => handleThumbsChange(e.target.value)}
                                error={!!errors['params.thumbs']}
                                helperText={errors['params.thumbs'] || 'Размеры эскизов (200x100, 400x200|resize)'}
                                size="small"
                                placeholder="Введите значение для thumbs"
                            />
                        </>
                    )}

                    {/* Параметры (для галереи/повторителя) */}
                    {showParams && (
                        <>
                            <Divider/>
                            <Typography variant="subtitle2" color="text.secondary">
                                Настройка параметров
                            </Typography>
                            <Typography variant="body2" color="text.disabled">
                                Дополнительные параметры для выбранного типа настройки
                            </Typography>
                            <EditParams
                                type={formData.type}
                                params={formData.params}
                                types={types}
                                onChange={handleParamsChange}
                            />
                        </>
                    )}
                </Stack>

                {/* Кнопки */}
                <Stack
                    direction="row"
                    spacing={1.5}
                    justifyContent="flex-end"
                    sx={{mt: 3}}
                >
                    <Button
                        variant="outlined"
                        onClick={() => closeModal()}
                        disabled={processing}
                        size="small"
                    >
                        Отмена
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={processing ? <CircularProgress size={16} color="inherit"/> : <SaveIcon/>}
                        disabled={processing}
                        size="small"
                    >
                        {processing ? 'Сохранение...' : isNew ? 'Создать' : 'Сохранить'}
                    </Button>
                </Stack>
            </Box>
        </Box>
    );
}

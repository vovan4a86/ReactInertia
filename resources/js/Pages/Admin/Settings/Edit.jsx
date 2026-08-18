import React, { useCallback, useMemo, useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    FormControl,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {
    Save as SaveIcon,
} from '@mui/icons-material';
import EditParams from './EditParams';
import {useModal} from '@/Contexts/Admin/ModalContext.jsx';
import { SETTING_TYPE } from './utils/uploads';

/** Пояснение к каждому типу настройки. */
const TYPE_DESCRIPTIONS = {
    [SETTING_TYPE.TEXT]: 'Простое текстовое поле для коротких значений.',
    [SETTING_TYPE.TEXTAREA]: 'Многострочное поле для длинного текста без разметки.',
    [SETTING_TYPE.EDITOR]: 'Визуальный редактор форматированного текста (HTML).',
    [SETTING_TYPE.FILE]: 'Загрузка одного файла: изображение или документ.',
    [SETTING_TYPE.DATA]: 'Набор именованных полей разных типов (объект).',
    [SETTING_TYPE.LIST]: 'Простой список строковых значений с сортировкой.',
    [SETTING_TYPE.LIST_DATA]: 'Повторитель: список объектов с настраиваемыми полями.',
    [SETTING_TYPE.GALLERY]: 'Галерея изображений с сортировкой и миниатюрами.',
    [SETTING_TYPE.BOOLEAN]: 'Флажок «да/нет»: переключатель или чекбокс.',
};

/**
 * Создание / редактирование настройки (открывается в модалке).
 *
 * @param {object} props
 * @param {object} props.setting настройка (или заготовка новой)
 * @param {Array}  props.groups
 * @param {Record<number, string>} props.types
 */
export default function Edit({setting, groups, types}) {
    const {closeModal} = useModal();
    const isNew = !setting?.id;

    const {
        data,
        setData,
        post, processing,
        errors,
        transform } = useForm({
        setting_group_id: setting?.setting_group_id ?? '',
        code: setting?.code ?? '',
        type: Number(setting?.type ?? SETTING_TYPE.TEXT),
        name: setting?.name ?? '',
        description: setting?.description ?? '',
        params: setting?.params ?? {},
        order: setting?.order ?? 0,
    });

    // PUT через POST + _method — обязательное условие для multipart/FormData
    transform((payload) => (isNew ? payload : { ...payload, _method: 'PUT' }));

    const showFields = [SETTING_TYPE.DATA, SETTING_TYPE.LIST_DATA].includes(data.type);
    const showGallery = data.type === SETTING_TYPE.GALLERY;

    /** Смена типа сбрасывает несовместимые params. */
    const handleTypeChange = useCallback(
        (event) => {
            const type = Number(event.target.value);

            setData((prev) => ({
                ...prev,
                type,
                params:
                    type === SETTING_TYPE.GALLERY
                        ? { thumbs: prev.params?.thumbs ?? '' }
                        : [SETTING_TYPE.DATA, SETTING_TYPE.LIST_DATA].includes(type)
                            ? { fields: prev.params?.fields ?? {} }
                            : {},
            }));
        },
        [setData],
    );

    const handleSubmit = useCallback(
        (event) => {
            event.preventDefault();

            const url = isNew
                ? route('admin.settings.store')
                : route('admin.settings.update', {id: setting.id});

            post(url, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });
        },
        [isNew, post, setting?.id, closeModal]
    );

    const typeOptions = useMemo(() => Object.entries(types), [types]);

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography variant="h6" gutterBottom>
                {isNew ? 'Новая настройка' : 'Редактирование настройки'}
            </Typography>

            <Stack spacing={2.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        sx={{ flex: 3 }}
                        size="small"
                        label="Название"
                        required
                        value={data.name}
                        onChange={(event) => setData('name', event.target.value)}
                        error={Boolean(errors.name)}
                        helperText={errors.name}
                        placeholder="Например: Телефон в шапке"
                    />

                    <FormControl sx={{ flex: 2 }} size="small" required error={Boolean(errors.setting_group_id)}>
                        <InputLabel>Группа</InputLabel>
                        <Select
                            label="Группа"
                            value={data.setting_group_id}
                            onChange={(event) => setData('setting_group_id', event.target.value)}
                        >
                            {groups.map((group) => (
                                <MenuItem key={group.id} value={group.id}>
                                    {group.name}
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.setting_group_id && <FormHelperText>{errors.setting_group_id}</FormHelperText>}
                    </FormControl>

                    <TextField
                        sx={{ flex: 1 }}
                        size="small"
                        label="Порядок"
                        type="number"
                        value={data.order}
                        onChange={(event) => setData('order', event.target.value === '' ? 0 : Number(event.target.value))}
                        error={Boolean(errors.order)}
                        helperText={errors.order}
                        slotProps={{ htmlInput: { min: 0, max: 9999, inputMode: 'numeric' } }}
                    />
                </Stack>

                <TextField
                    fullWidth
                    size="small"
                    label="Описание (подсказка)"
                    value={data.description}
                    onChange={(event) => setData('description', event.target.value)}
                    error={Boolean(errors.description)}
                    helperText={errors.description}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        sx={{ flex: 1 }}
                        size="small"
                        label="Системный ключ"
                        required
                        value={data.code}
                        onChange={(event) => setData('code', event.target.value.trim())}
                        error={Boolean(errors.code)}
                        helperText={errors.code || 'Уникальный ключ для Setting::get()'}
                        placeholder="site_title"
                    />

                    <FormControl sx={{ flex: 1 }} size="small" required error={Boolean(errors.type)}>
                        <InputLabel>Тип</InputLabel>
                        <Select label="Тип" value={data.type} onChange={handleTypeChange}>
                            {typeOptions.map(([value, label]) => (
                                <MenuItem key={value} value={Number(value)}>
                                    {label}
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
                    </FormControl>
                </Stack>

                <Alert severity="info" variant="outlined">
                    {TYPE_DESCRIPTIONS[data.type] ?? 'Выберите тип настройки'}
                </Alert>

                {showGallery && (
                    <>
                        <Divider />
                        <Typography variant="subtitle2" color="text.secondary">
                            Параметры галереи
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            label="Миниатюры"
                            value={data.params?.thumbs ?? ''}
                            onChange={(event) => setData('params', { ...data.params, thumbs: event.target.value })}
                            error={Boolean(errors['params.thumbs'])}
                            helperText={errors['params.thumbs'] || 'Формат: 200x100, 400x200|cover'}
                            placeholder="200x100, 400x200|cover"
                        />
                    </>
                )}

                {showFields && (
                    <>
                        <Divider />
                        <Typography variant="subtitle2" color="text.secondary">
                            Поля данных
                        </Typography>
                        <EditParams
                            type={data.type}
                            params={data.params}
                            types={types}
                            onChange={(params) => setData('params', params)}
                        />
                        {errors.params && <FormHelperText error>{errors.params}</FormHelperText>}
                    </>
                )}
            </Stack>

            <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 3 }}>
                <Button size="small" variant="outlined" onClick={closeModal} disabled={processing}>
                    Отмена
                </Button>
                <Button
                    size="small"
                    type="submit"
                    variant="contained"
                    disabled={processing}
                    startIcon={processing ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                >
                    {processing ? 'Сохранение…' : isNew ? 'Создать' : 'Сохранить'}
                </Button>
            </Stack>
        </Box>
    );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import {
    alpha,
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    Divider,
    FormControl,
    FormControlLabel,
    FormHelperText,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    Close as CloseIcon,
    CloudUpload as CloudUploadIcon,
    Delete as DeleteIcon,
    OpenInNew as OpenInNewIcon,
    Save as SaveIcon,
    SwapHoriz as SwapHorizIcon,
    ZoomIn as ZoomInIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

import RichTextEditor from '@admin-pages/Settings/Fields/RichTextEditor/RichTextEditor.jsx';
import ImageUploader from '@admin-components/ImageUploader/ImageUploader.jsx';

/** Значения формы по умолчанию — единый источник, чтобы useForm не терял поля. */
const EMPTY = {
    parent_id: '', name: '', h1: '', alias: '', announce: '', text: '',
    published: true, on_header_menu: false, on_footer_menu: false, on_mobile_menu: false,
    title: '', keywords: '', description: '', og_title: '', og_description: '',
    image: null, image_deleted: false,
    images: [], deleted_images: [], new_images: [],
};

const MENU_SWITCHES = [
    { key: 'on_header_menu', title: 'Показывать в шапке',         active: '✓ Отображается в шапке',          inactive: 'Скрыта из шапки' },
    { key: 'on_footer_menu', title: 'Показывать в подвале',       active: '✓ Отображается в подвале',         inactive: 'Скрыта из подвала' },
    { key: 'on_mobile_menu', title: 'Показывать в мобильном меню',active: '✓ Отображается в мобильном меню',  inactive: 'Скрыта из мобильного меню' },
];

/**
 * Форма страницы. Один `useForm` — он же отправляет multipart,
 * поэтому `processing`, `errors` и `isDirty` работают штатно.
 */
export default function PageForm({ page, parents, mode }) {
    const isEdit = mode === 'edit' && page?.id;

    const {
        data,
        setData,
        post,
        processing,
        errors,
        isDirty,
        recentlySuccessful,
        transform
    } = useForm({
        ...EMPTY,
        ...page,
        // images хранит объекты с бэкенда; ImageUploader сам разберёт их
        images: page?.images ?? [],
    });

    const [tab, setTab]           = useState(0);
    const [preview, setPreview]   = useState(null);   // blob-URL для главного фото
    const [imgDialog, setImgDialog] = useState(false); // диалог просмотра главного фото

    // Булевы значения в FormData должны стать '1'/'0', иначе `false` придёт как "false"
    transform((payload) => ({
        ...payload,
        ...Object.fromEntries(
            MENU_SWITCHES.map(({ key }) => [key, payload[key] ? 1 : 0]),
        ),
        published:     payload.published     ? 1 : 0,
        image_deleted: payload.image_deleted ? 1 : 0,
        parent_id:     payload.parent_id === '' ? null : payload.parent_id,
    }));

    /** Освобождаем blob-URL — иначе утечка памяти при каждой смене файла. */
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    useEffect(() => {
        if (recentlySuccessful) toast.success('Сохранено');
    }, [recentlySuccessful]);

    /* ── главное изображение ── */
    const handleImage = useCallback((file) => {
        setPreview((old) => {
            if (old) URL.revokeObjectURL(old);
            return file ? URL.createObjectURL(file) : null;
        });
        setData((cur) => ({ ...cur, image: file ?? null, image_deleted: !file }));
    }, [setData]);

    /* ── галерея (ImageUploader callback) ── */
    const handleImagesChange = useCallback((order, files, deleted) => {
        setData((cur) => ({
            ...cur,
            images:         order,
            new_images:     files,
            deleted_images: deleted,
        }));
    }, [setData]);

    /* ── отправка ── */
    const submit = (e) => {
        e.preventDefault();
        post(
            isEdit ? route('admin.pages.update', page.id) : route('admin.pages.store'),
            {
                forceFormData: true,
                preserveScroll: true,
                only: ['tree', 'page', 'parents', 'errors', 'flash'],
                onError: () => toast.error('Проверьте заполнение полей'),
            },
        );
    };

    /* ── опции родителей с отступом ── */
    const parentOptions = useMemo(
        () => parents.map((opt) => ({
            ...opt,
            label: `${'\u00A0\u00A0'.repeat(opt.depth)}${opt.depth ? '└ ' : ''}${opt.name}`,
        })),
        [parents],
    );

    /* ── превью главного фото ── */
    const mainThumbSrc = preview                              // только что выбранный файл
        ?? (page?.single_thumb ?? null);                      // или уже сохранённый thumb

    const mainSrc      = preview
        ?? (page?.single_image_src ?? null);

    /* ── helper ── */
    const field = (name) => ({
        value:     data[name],
        onChange:  (e) => setData(name, e.target.value),
        error:     !!errors[name],
        helperText: errors[name],
        size:      'small',
        fullWidth: true,
    });

    return (
        <Box
            component="form"
            onSubmit={submit}
            sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            {/* ── шапка ── */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="h6" noWrap>
                        {isEdit ? (page?.name || 'Редактирование') : 'Новая страница'}
                    </Typography>
                    {page?.url && (
                        <Tooltip title="Открыть на сайте">
                            <IconButton
                                component="a"
                                href={page.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="small"
                                color="primary"
                            >
                                <OpenInNewIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                <FormControlLabel
                    control={
                        <Switch
                            checked={Boolean(data.published)}
                            onChange={(e) => setData('published', e.target.checked)}
                            size="small"
                            color="success"
                        />
                    }
                    label={
                        <Typography variant="body2" color={data.published ? 'success.main' : 'text.secondary'}>
                            {data.published ? 'Опубликована' : 'Черновик'}
                        </Typography>
                    }
                    labelPlacement="start"
                />
            </Box>

            {/* ── табы ── */}
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
            >
                <Tab label="Параметры" />
                <Tab label="Текст" />
                <Tab label="Изображения" />
            </Tabs>

            {/* ── содержимое табов ── */}
            <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>

                {/* ══ ТАБ 0: ПАРАМЕТРЫ ══ */}
                {tab === 0 && (
                    <Box>
                        {/* Основные поля + главное фото */}
                        <Box sx={{ display: 'flex', gap: 3, pt: 1 }}>

                            {/* Левая колонка: текстовые поля */}
                            <Box sx={{ flex: 3 }}>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Название"
                                        required
                                        {...field('name')}
                                    />
                                    <TextField label="H1" {...field('h1')} />
                                    <TextField
                                        label="Alias"
                                        {...field('alias')}
                                        helperText={errors.alias || 'Автоматически из названия'}
                                    />

                                    {/* Родительская страница */}
                                    <FormControl fullWidth size="small" error={!!errors.parent_id}>
                                        <InputLabel>Родительская страница</InputLabel>
                                        <Select
                                            value={data.parent_id}
                                            onChange={(e) => setData('parent_id', e.target.value)}
                                            label="Родительская страница"
                                        >
                                            <MenuItem value="">Нет (Корневая)</MenuItem>
                                            {parentOptions.map((opt) => (
                                                <MenuItem key={opt.id} value={opt.id}>
                                                    {opt.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        {errors.parent_id && (
                                            <FormHelperText>{errors.parent_id}</FormHelperText>
                                        )}
                                    </FormControl>

                                    <TextField
                                        label="Анонс"
                                        multiline
                                        rows={3}
                                        {...field('announce')}
                                    />
                                </Stack>
                            </Box>

                            {/* Правая колонка: главное фото */}
                            <Box sx={{ flex: 1, minWidth: 140 }}>
                                <Box
                                    sx={{
                                        position: 'relative',
                                        width: '100%',
                                        aspectRatio: '1/1',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        bgcolor: 'grey.100',
                                        border: '2px dashed',
                                        borderColor: mainThumbSrc ? 'transparent' : 'grey.300',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: mainThumbSrc ? 'transparent' : 'primary.main',
                                        },
                                    }}
                                >
                                    {mainThumbSrc ? (
                                        <>
                                            <img
                                                src={mainThumbSrc}
                                                alt="Превью"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                onClick={() => setImgDialog(true)}
                                            />

                                            {/* Оверлей при наведении */}
                                            <Box
                                                sx={{
                                                    position: 'absolute', inset: 0,
                                                    bgcolor: 'rgba(0,0,0,0.4)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                                                    opacity: 0, transition: 'opacity 0.2s',
                                                    '&:hover': { opacity: 1 },
                                                }}
                                            >
                                                <Tooltip title="Просмотр">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => { e.stopPropagation(); setImgDialog(true); }}
                                                        sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}
                                                    >
                                                        <ZoomInIcon fontSize="small" sx={{ color: 'grey.800' }} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Удалить">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleImage(null);
                                                            toast.info('Изображение будет удалено после сохранения');
                                                        }}
                                                        sx={{ bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>

                                            {/* Кнопка «Заменить» */}
                                            <Button
                                                component="label"
                                                size="small"
                                                sx={{
                                                    position: 'absolute', bottom: 8, right: 8,
                                                    bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)',
                                                    fontSize: '0.7rem', px: 1.5, py: 0.5, borderRadius: 1,
                                                    '&:hover': { bgcolor: 'white' },
                                                }}
                                            >
                                                <SwapHorizIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                                Заменить
                                                <input type="file" hidden accept="image/*"
                                                       onChange={(e) => {
                                                           const f = e.target.files?.[0];
                                                           if (f) { handleImage(f); toast.info('Будет заменено после сохранения'); }
                                                       }}
                                                />
                                            </Button>
                                        </>
                                    ) : (
                                        /* Зона загрузки */
                                        <Button
                                            component="label"
                                            sx={{
                                                width: '100%', height: '100%',
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center', gap: 0.5,
                                                textTransform: 'none',
                                            }}
                                        >
                                            <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                                            <Typography variant="body2" color="text.secondary">
                                                Загрузить фото
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                JPEG, PNG, WebP
                                            </Typography>
                                            <input type="file" hidden accept="image/*"
                                                   onChange={(e) => {
                                                       const f = e.target.files?.[0];
                                                       if (f) handleImage(f);
                                                   }}
                                            />
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        {/* ── Meta-данные ── */}
                        <Divider sx={{ my: 3 }}>
                            <Chip label="Meta / SEO" size="small" />
                        </Divider>

                        <Stack spacing={2}>
                            <TextField label="Title" {...field('title')} slotProps={{ inputLabel: { shrink: true } }} />
                            <TextField label="Keywords" {...field('keywords')} slotProps={{ inputLabel: { shrink: true } }} />
                            <TextField
                                label="Description"
                                multiline rows={3}
                                {...field('description')}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <TextField label="OG Title" {...field('og_title')} slotProps={{ inputLabel: { shrink: true } }} />
                            <TextField label="OG Description" {...field('og_description')} slotProps={{ inputLabel: { shrink: true } }} />
                        </Stack>

                        {/* ── Видимость в меню ── */}
                        <Divider sx={{ my: 3 }}>
                            <Chip label="Видимость" size="small" />
                        </Divider>

                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                                gap: 2,
                            }}
                        >
                            {MENU_SWITCHES.map(({ key, title, active, inactive }) => (
                                <Box
                                    key={key}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        p: '12px 16px',
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: data[key] ? 'success.main' : 'divider',
                                        bgcolor: data[key]
                                            ? (theme) => alpha(theme.palette.success.main, 0.04)
                                            : 'background.paper',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <Box sx={{ mr: 2, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={500} noWrap>{title}</Typography>
                                        <Typography
                                            variant="caption"
                                            color={data[key] ? 'success.main' : 'text.secondary'}
                                            fontWeight={data[key] ? 600 : 400}
                                            noWrap
                                        >
                                            {data[key] ? active : inactive}
                                        </Typography>
                                    </Box>
                                    <Switch
                                        checked={Boolean(data[key])}
                                        onChange={(e) => setData(key, e.target.checked)}
                                        size="small"
                                        color="success"
                                        sx={{ flexShrink: 0 }}
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* ══ ТАБ 1: ТЕКСТ ══ */}
                {tab === 1 && (
                    <Box sx={{ pt: 1 }}>
                        <FormControl fullWidth variant="outlined">
                            <InputLabel shrink>Содержание</InputLabel>
                            <Box sx={{ mt: 2 }}>
                                <RichTextEditor
                                    value={data.text}
                                    onChange={(val) => setData('text', val)}
                                />
                            </Box>
                            {errors.text && (
                                <FormHelperText error>{errors.text}</FormHelperText>
                            )}
                        </FormControl>
                    </Box>
                )}

                {/* ══ ТАБ 2: ИЗОБРАЖЕНИЯ ══ */}
                {tab === 2 && (
                    <Box sx={{ pt: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Изображения страницы
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                            JPEG, PNG, GIF, WebP • Макс. 10 MB • Автоконвертация в WebP
                        </Typography>
                        <ImageUploader
                            images={data.images}
                            pageId={page?.id}
                            maxImages={10}
                            multiple
                            onChange={handleImagesChange}
                        />
                    </Box>
                )}
            </Box>

            {/* ── Диалог просмотра главного фото ── */}
            <Dialog open={imgDialog} onClose={() => setImgDialog(false)} maxWidth="lg" fullWidth>
                <DialogContent sx={{ p: 0, position: 'relative', bgcolor: 'black' }}>
                    <IconButton
                        onClick={() => setImgDialog(false)}
                        sx={{
                            position: 'absolute', top: 8, right: 8, zIndex: 1,
                            bgcolor: 'rgba(0,0,0,0.5)', color: 'white',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    {mainSrc && (
                        <img
                            src={mainSrc}
                            alt="Полное изображение"
                            style={{ width: '100%', maxHeight: '90vh', objectFit: 'contain', display: 'block' }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Панель действий ── */}
            <Box
                sx={{
                    display: 'flex', gap: 2, justifyContent: 'flex-end',
                    pt: 2, mt: 'auto',
                    borderTop: 1, borderColor: 'divider',
                }}
            >
                {isEdit && (
                    <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => {
                            if (window.confirm(`Удалить страницу «${page.name}»?`)) {
                                router.delete(route('admin.pages.destroy', page.id), { preserveScroll: true });
                            }
                        }}
                    >
                        Удалить
                    </Button>
                )}

                <Button
                    type="submit"
                    variant="contained"
                    startIcon={isEdit ? <SaveIcon /> : <AddIcon />}
                    disabled={processing || !isDirty}
                    loading={processing}
                >
                    {processing ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать'}
                </Button>
            </Box>
        </Box>
    );
}

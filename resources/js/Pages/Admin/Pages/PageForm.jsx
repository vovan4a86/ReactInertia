import {useCallback, useEffect, useMemo, useState} from 'react';
import {router, useForm} from '@inertiajs/react';
import {
    alpha, Box, Button, Chip, Dialog, DialogContent, Divider, Grid, FormControl,
    FormControlLabel, FormHelperText, InputLabel, MenuItem, Select, Stack,
    Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import {
    Add as AddIcon, Close as CloseIcon, CloudUpload as CloudUploadIcon,
    Delete as DeleteIcon, OpenInNew as OpenInNewIcon, Save as SaveIcon,
    SwapHoriz as SwapHorizIcon, ZoomIn as ZoomInIcon,
} from '@mui/icons-material';
import {toast} from 'react-toastify';

import RichTextEditor from '@admin-pages/Settings/Fields/RichTextEditor/RichTextEditor.jsx';
import ImageUploader from '@admin-components/ImageUploader/ImageUploader.jsx';

const MENU_SWITCHES = [
    {key: 'on_header_menu', title: 'Показывать в шапке', active: '✓ Отображается в шапке', inactive: 'Скрыта из шапки'},
    {
        key: 'on_footer_menu',
        title: 'Показывать в подвале',
        active: '✓ Отображается в подвале',
        inactive: 'Скрыта из подвала'
    },
    {
        key: 'on_mobile_menu',
        title: 'Показывать в мобильном меню',
        active: '✓ Отображается в мобильном меню',
        inactive: 'Скрыта из мобильного меню'
    },
];

const TEXT_FIELDS = ['name', 'h1', 'alias', 'announce', 'text', 'title', 'keywords', 'description', 'og_title', 'og_description'];

/**
 * ⚡ КЛЮЧЕВОЙ ФИКС: строим data по белому списку.
 * Раньше делали `{...EMPTY, ...page}` — и в FormData улетали
 * id / slug / url / breadcrumbs / updated_at, а `image` уходил СТРОКОЙ,
 * из-за чего правило `image` валило запрос целиком (422).
 */
function buildInitial(page) {
    const data = {
        parent_id: page?.parent_id ?? '',
        published: page?.published ?? true,
        image: null,            // ← ТОЛЬКО File | null
        image_deleted: false,
        images: (page?.images ?? []).map((img) => img.name),   // токены существующих
        new_images: {},         // { tempId: File }
        deleted_images: [],
    };

    TEXT_FIELDS.forEach((key) => {
        data[key] = page?.[key] ?? '';
    });
    MENU_SWITCHES.forEach(({key}) => {
        data[key] = Boolean(page?.[key]);
    });

    return data;
}

export default function PageForm({page, parents = [], mode}) {
    const isEdit = Boolean(page?.id);

    /** Ключ пересинхронизации: меняется при переходе и после каждого сохранения. */
    const syncKey = `${page?.id ?? 'new'}:${page?.updated_at ?? ''}`;
    const initial = useMemo(() => buildInitial(page), [syncKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const {
        data, setData, setDefaults, post, processing, errors, clearErrors, isDirty, transform,
    } = useForm(initial);

    const [tab, setTab] = useState(0);
    const [preview, setPreview] = useState(null);
    const [imgDialog, setImgDialog] = useState(false);

    /* ── Подтягиваем свежие данные после сохранения / смены страницы ── */
    useEffect(() => {
        setData(initial);
        setDefaults(initial);
        setPreview((old) => {
            if (old) URL.revokeObjectURL(old);
            return null;
        });
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial]);

    useEffect(() => () => {
        if (preview) URL.revokeObjectURL(preview);
    }, [preview]);

    /* ── Нормализация payload перед отправкой ── */
    transform((d) => {
        const payload = {
            ...d,
            parent_id: d.parent_id === '' ? null : d.parent_id,
            published: d.published ? 1 : 0,
            image_deleted: d.image_deleted ? 1 : 0,
            ...Object.fromEntries(MENU_SWITCHES.map(({key}) => [key, d[key] ? 1 : 0])),
        };

        // `image` отправляем ТОЛЬКО если это реальный файл
        if (!(payload.image instanceof File)) delete payload.image;

        // Спуфинг метода: multipart всегда уходит через POST
        if (isEdit) payload._method = 'put';

        return payload;
    });

    /* ── Главное изображение ── */
    const handleImage = useCallback((file) => {
        setPreview((old) => {
            if (old) URL.revokeObjectURL(old);
            return file ? URL.createObjectURL(file) : null;
        });
        setData((cur) => ({...cur, image: file ?? null, image_deleted: !file}));
    }, [setData]);

    /* ── Галерея ── */
    const handleImagesChange = useCallback((order, files, deleted) => {
        setData((cur) => ({...cur, images: order, new_images: files, deleted_images: deleted}));
    }, [setData]);

    /* ── Карта «поле → вкладка» для авто-перехода при ошибке ── */
    const TAB_OF_FIELD = useMemo(() => ({
        name: 0, h1: 0, alias: 0, announce: 0, text: 0,
        parent_id: 1, published: 1, order: 1,
        on_header_menu: 1, on_footer_menu: 1, on_mobile_menu: 1,
        title: 1, keywords: 1, description: 1, og_title: 1, og_description: 1,
        image: 2, image_deleted: 2, images: 2, new_images: 2, deleted_images: 2,
    }), []);

    /* ── Отправка ── */
    const submit = useCallback((e) => {
        e?.preventDefault?.();

        const url = isEdit
            ? route('admin.pages.update', page.id)
            : route('admin.pages.store');

        // ⚡ Всегда POST + forceFormData: PUT не умеет multipart в PHP.
        // Метод подменяется через _method в transform().
        post(url, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => toast.success(isEdit ? '✅ Изменения сохранены' : '✅ Страница создана'),
            onError: (errs) => {
                const keys = Object.keys(errs);

                // Ошибки вида "new_images.0" / "images.2" → берём корневое поле
                const tabs = keys
                    .map((k) => TAB_OF_FIELD[k.split('.')[0]])
                    .filter((t) => t !== undefined);

                if (tabs.length) setTab(Math.min(...tabs));

                toast.error(errs[keys[0]] ?? 'Проверьте правильность заполнения формы');
            },
        });
    }, [isEdit, page?.id, post, TAB_OF_FIELD]);

    /* ── Ctrl/Cmd + S ── */
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (!processing) submit();
            }
        };

        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [submit, processing]);

    /* ── Защита от потери несохранённых данных ── */
    useEffect(() => {
        if (!isDirty) return undefined;

        const onBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);

        const off = router.on('before', (event) => {
            if (event.detail.visit.method === 'get' && !confirm('Есть несохранённые изменения. Покинуть страницу?')) {
                return false;
            }
            return true;
        });

        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            off();
        };
    }, [isDirty]);

    /* ── Хелперы полей ── */
    const field = useCallback((key, label, extra = {}) => (
        <Grid item xs={12}>
            <TextField
                fullWidth
                size="small"
                label={label}
                value={data[key] ?? ''}
                onChange={(e) => setData(key, e.target.value)}
                error={Boolean(errors[key])}
                helperText={errors[key] ?? extra.helperText}
                {...extra}
            />
        </Grid>
    ), [data, errors, setData]);

    /* Текущее превью главного фото: blob → серверный thumb → null */
    const mainSrc = preview
        ?? (!data.image_deleted && !data.image ? page?.single_thumb ?? page?.single_image_src : null)
        ?? null;

    const errorCount = Object.keys(errors).length;

    /* ═════════════════════════════ RENDER ═════════════════════════════ */

    return (
        <Box component="form" onSubmit={submit} noValidate>
            {/* ── Шапка ── */}
            <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 2}}>
                <Typography variant="h6" sx={{flexGrow: 1}} noWrap>
                    {isEdit ? data.name || 'Без названия' : 'Новая страница'}

                    {isEdit && page?.url && (
                        <Tooltip title="Открыть на сайте" sx={{ ml: 2 }}>
                            <Button
                                size="small"
                                component="a"
                                href={page.url}
                                target="_blank"
                                rel="noopener"
                                startIcon={<OpenInNewIcon/>}
                            >
                                Просмотр
                            </Button>
                        </Tooltip>
                    )}


                    {isDirty && <Chip size="small" color="warning" label="Не сохранено"/>}
                    {errorCount > 0 && <Chip size="small" color="error" label={`Ошибок: ${errorCount}`}/>}
                </Typography>

                <FormControlLabel
                    control={
                        <Switch
                            checked={Boolean(data.published)}
                            onChange={(e) => setData('published', e.target.checked)}
                            size="small" color="success"
                        />
                    }
                    label={data.published ? 'Опубликована' : 'Черновик'}
                    labelPlacement="start"
                />

                <Button
                    type="submit"
                    variant="contained"
                    size="small"
                    startIcon={<SaveIcon/>}
                    loading={processing}
                    loadingPosition="start"
                    disabled={processing || (isEdit && !isDirty)}
                >
                    Сохранить
                </Button>
            </Stack>

            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{borderBottom: 1, borderColor: 'divider', mb: 2, minHeight: 40}}
            >
                <Tab label="Параметры" sx={{minHeight: 40}}/>
                <Tab label="Содержимое" sx={{minHeight: 40}}/>
                <Tab
                    label={`Изображения${data.images.length ? ` (${data.images.length})` : ''}`}
                    sx={{minHeight: 40}}
                />
            </Tabs>

            {/* ══════════ TAB 0 — Параметры ══════════ */}
            <Box hidden={tab !== 0}>
                <Box sx={{display: 'flex', gap: 3, pt: 2}}>
                    {/* Левая колонка 75% */}
                    <Box sx={{flex: 3}}>
                        <Grid container spacing={2} direction="column">
                            {field('name', 'Название *', {required: true, autoFocus: !isEdit})}

                            {field('h1', 'Заголовок H1', {helperText: 'Если пусто — используется название'})}
                            {field('alias', 'Alias (URL)', {
                                helperText: errors.alias ?? (page?.url || 'Латиница, цифры, дефис. Пусто — сгенерируется автоматически'),
                                slotProps: {input: {spellCheck: false}},
                            })}

                            <FormControl fullWidth size="small" error={Boolean(errors.parent_id)}>
                                <InputLabel id="parent-label">Родительская страница</InputLabel>
                                <Select
                                    labelId="parent-label"
                                    label="Родительская страница"
                                    value={data.parent_id ?? ''}
                                    onChange={(e) => setData('parent_id', e.target.value)}
                                >
                                    <MenuItem value=""><em>— Корень —</em></MenuItem>
                                    {parents.map((p) => (
                                        <MenuItem key={p.id} value={String(p.id)}>
                                            {'\u00A0'.repeat((p.depth ?? 0) * 3)}{p.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.parent_id && <FormHelperText>{errors.parent_id}</FormHelperText>}
                            </FormControl>
                        </Grid>
                    </Box>

                    {/* Правая колонка 25% - Изображение */}
                    <Box sx={{flex: 1}}>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>Главное изображение</Typography>

                                <Stack direction="row" spacing={2} alignItems="flex-start">
                                    <Box
                                        sx={{
                                            width: 180, height: 135, flexShrink: 0,
                                            borderRadius: 1, overflow: 'hidden',
                                            border: '1px dashed', borderColor: 'divider',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            bgcolor: (t) => alpha(t.palette.text.primary, 0.03),
                                            cursor: mainSrc ? 'zoom-in' : 'default',
                                            position: 'relative',
                                        }}
                                        onClick={() => mainSrc && setImgDialog(true)}
                                    >
                                        {mainSrc ? (
                                            <>
                                                <Box
                                                    component="img"
                                                    src={mainSrc}
                                                    alt="Главное изображение"
                                                    sx={{width: '100%', height: '100%', objectFit: 'cover'}}
                                                />
                                                <ZoomInIcon
                                                    sx={{
                                                        position: 'absolute', right: 4, bottom: 4,
                                                        color: 'common.white', filter: 'drop-shadow(0 0 2px #000)',
                                                    }}
                                                />
                                            </>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">Нет
                                                изображения</Typography>
                                        )}
                                    </Box>

                                    <Stack spacing={1}>
                                        <Button
                                            component="label"
                                            variant="outlined"
                                            size="small"
                                            startIcon={mainSrc ? <SwapHorizIcon/> : <CloudUploadIcon/>}
                                        >
                                            {mainSrc ? 'Заменить' : 'Загрузить'}
                                            <input
                                                hidden
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    handleImage(e.target.files?.[0] ?? null);
                                                    e.target.value = '';   // повторный выбор того же файла
                                                }}
                                            />
                                        </Button>

                                        {mainSrc && (
                                            <Button
                                                size="small"
                                                color="error"
                                                startIcon={<DeleteIcon/>}
                                                onClick={() => handleImage(null)}
                                            >
                                                Удалить
                                            </Button>
                                        )}

                                        <Typography variant="caption" color="text.secondary">
                                            JPEG, PNG, WebP · до 10 MB
                                        </Typography>

                                        {errors.image && <FormHelperText error>{errors.image}</FormHelperText>}
                                    </Stack>
                                </Stack>
                            </Box>
                        </Stack>
                    </Box>
                </Box>

                <Box sx={{mt: 2}}>
                    <Divider sx={{mb: 2}}>
                        <Chip label="SEO" size="small"/>
                    </Divider>
                    <Grid container spacing={2} direction="column">
                        {field('title', 'Meta Title', {
                            helperText: errors.title ?? `${(data.title || '').length} / 60 символов`,
                        })}
                        {field('keywords', 'Meta Keywords')}
                        {field('description', 'Meta Description', {
                            multiline: true,
                            minRows: 2,
                            helperText: errors.description ?? `${(data.description || '').length} / 160 символов`,
                        })}
                        {field('og_title', 'OG Title')}
                        {field('og_description', 'OG Description', {multiline: true, minRows: 2})}
                    </Grid>
                </Box>

                <Box sx={{my: 2}}>
                    <Divider sx={{mb: 2}}>
                        <Chip label="Видимость" size="small"/>
                    </Divider>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: '1fr 1fr',
                                md: '1fr 1fr 1fr',
                            },
                            gap: 2,
                        }}
                    >
                        {MENU_SWITCHES.map((item) => (
                            <Box
                                key={item.key}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: data[item.key] ? 'success.main' : 'divider',
                                    backgroundColor: data[item.key]
                                        ? (theme) => alpha(theme.palette.success.main, 0.04)
                                        : 'background.paper',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Box sx={{mr: 2, minWidth: 0}}>
                                    <Typography variant="body2" fontWeight={500} noWrap>
                                        {item.title}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color={data[item.key] ? 'success.main' : 'text.secondary'}
                                        fontWeight={data[item.key] ? 600 : 400}
                                        noWrap
                                    >
                                        {data[item.key] ? item.active : item.inactive}
                                    </Typography>
                                </Box>

                                <Switch
                                    checked={data[item.key]}
                                    onChange={(e) => setData(item.key, e.target.checked)}
                                    size="small"
                                    color="success"
                                    sx={{flexShrink: 0}}
                                />
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>

            {/* ══════════ TAB 1 — Содержимое  ══════════ */}
            <Box hidden={tab !== 1}>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="caption" color="text.secondary">Анонс</Typography>
                        <RichTextEditor
                            value={data.announce}
                            onChange={(html) => setData('announce', html)}
                            minHeight={140}
                        />
                        {errors.announce && <FormHelperText error>{errors.announce}</FormHelperText>}
                    </Box>

                    <Box>
                        <Typography variant="caption" color="text.secondary">Основной текст</Typography>
                        <RichTextEditor
                            value={data.text}
                            onChange={(html) => setData('text', html)}
                            minHeight={360}
                        />
                        {errors.text && <FormHelperText error>{errors.text}</FormHelperText>}
                    </Box>
                </Stack>
            </Box>

            {/* ══════════ TAB 2 — Изображения ══════════ */}
            <Box hidden={tab !== 2}>
                <Stack spacing={3}>
                    <Box>
                        <ImageUploader
                            images={page?.images ?? []}
                            resetKey={syncKey}
                            maxImages={10}
                            onChange={handleImagesChange}
                        />

                        {Object.entries(errors)
                            .filter(([k]) => k.startsWith('images') || k.startsWith('new_images'))
                            .map(([k, msg]) => <FormHelperText key={k} error>{msg}</FormHelperText>)}
                    </Box>
                </Stack>
            </Box>

            {/* Лайтбокс главного фото */}
            <Dialog open={imgDialog} onClose={() => setImgDialog(false)} maxWidth="lg">
                <DialogContent sx={{p: 0, bgcolor: 'black', position: 'relative'}}>
                    <Button
                        onClick={() => setImgDialog(false)}
                        sx={{position: 'absolute', top: 8, right: 8, minWidth: 0, color: 'common.white', zIndex: 1}}
                    >
                        <CloseIcon/>
                    </Button>
                    <Box
                        component="img"
                        src={preview ?? page?.single_image_src ?? mainSrc}
                        alt="Просмотр"
                        sx={{display: 'block', maxWidth: '90vw', maxHeight: '85vh'}}
                    />
                </DialogContent>
            </Dialog>

            <Box sx={{
                display: 'flex',
                gap: 2,
                justifyContent: 'flex-end',
                pt: 2,
                mt: 'auto',
                borderTop: 1,
                borderColor: 'divider'
            }}>
                <Button
                    type="submit"
                    variant="contained"
                    size="small"
                    startIcon={<SaveIcon/>}
                    loading={processing}
                    loadingPosition="start"
                    disabled={processing || (isEdit && !isDirty)}
                >
                    Сохранить
                </Button>
            </Box>
        </Box>
    );
}

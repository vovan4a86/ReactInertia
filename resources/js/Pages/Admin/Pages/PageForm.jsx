import { useEffect, useMemo, useState, useCallback } from 'react';
import { useForm } from '@inertiajs/react';
import SaveIcon from '@mui/icons-material/Save';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import { toast } from 'react-toastify';

import Editor from '@admin-pages/Settings/Fields/RichTextEditor/RichTextEditor.jsx';
import {Typography} from "@mui/material";
import ImageUploader from "@/Components/Admin/ImageUploader/ImageUploader.jsx";

/** Значения формы по умолчанию — единый источник, чтобы useForm не терял поля. */
const EMPTY = {
    parent_id: '', name: '', h1: '', alias: '', announce: '', text: '',
    published: true, on_header_menu: false, on_footer_menu: false, on_mobile_menu: false,
    title: '', keywords: '', description: '', og_title: '', og_description: '',
    image: null, image_deleted: false,
    images: [], deleted_images: [], new_images: [],
};

const MENU_SWITCHES = [
    ['published', 'Опубликована'],
    ['on_header_menu', 'Верхнее меню'],
    ['on_footer_menu', 'Нижнее меню'],
    ['on_mobile_menu', 'Мобильное меню'],
];

/**
 * Форма страницы. Один `useForm` — он же отправляет multipart,
 * поэтому `processing`, `errors` и `isDirty` работают штатно.
 */
export default function PageForm({ page, parents, mode }) {
    const isEdit = mode === 'edit' && page?.id;

    const { data, setData, post, processing, errors, isDirty, recentlySuccessful, transform } = useForm({
        ...EMPTY,
        ...page,
        images: (page?.images ?? []).map((img) => img.name),
    });

    const [tab, setTab] = useState(0);
    const [preview, setPreview] = useState(null);

    // Булевы значения в FormData должны стать '1'/'0', иначе `false` придёт как "false"
    transform((payload) => ({
        ...payload,
        ...Object.fromEntries(
            MENU_SWITCHES.map(([key]) => [key, payload[key] ? 1 : 0]),
        ),
        image_deleted: payload.image_deleted ? 1 : 0,
        parent_id: payload.parent_id === '' ? null : payload.parent_id,
    }));

    /** Освобождаем blob-URL — иначе утечка памяти при каждой смене файла. */
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    useEffect(() => {
        if (recentlySuccessful) toast.success('Сохранено');
    }, [recentlySuccessful]);

    const handleImagesChange = useCallback((
        newImagesOrder,
        newFiles,
        deletedImageIds
    ) => {
        setData(prevData => ({
            ...prevData,
            images: newImagesOrder,
            deleted_images: deletedImageIds || [],
            new_images: newFiles || [],
        }));
    }, [setData]);

    const handleImage = (file) => {
        setPreview((old) => {
            if (old) URL.revokeObjectURL(old);
            return file ? URL.createObjectURL(file) : null;
        });
        setData((current) => ({ ...current, image: file, image_deleted: !file }));
    };

    const submit = (event) => {
        event.preventDefault();

        post(
            isEdit ? route('admin.pages.update', page.id) : route('admin.pages.store'),
            {
                forceFormData: true,       // всегда multipart: файлы + вложенные массивы
                preserveScroll: true,
                only: ['tree', 'page', 'parents', 'errors', 'flash'],
                onError: () => toast.error('Проверьте заполнение полей'),
            },
        );
    };

    const parentOptions = useMemo(
        () => parents.map((option) => ({
            ...option,
            label: `${'\u00A0\u00A0'.repeat(option.depth)}${option.depth ? '└ ' : ''}${option.name}`,
        })),
        [parents],
    );

    return (
        <Card component="form" variant="outlined" onSubmit={submit} noValidate>
            <Tabs value={tab} onChange={(_, next) => setTab(next)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Основное" />
                <Tab label="Контент" />
                <Tab label="SEO" />
                <Tab label="Изображения" />
            </Tabs>

            <CardContent>
                <Box hidden={tab !== 0}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TextField
                                fullWidth required label="Название"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={Boolean(errors.name)} helperText={errors.name}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth label="Alias" placeholder="сгенерируется из названия"
                                value={data.alias}
                                onChange={(e) => setData('alias', e.target.value)}
                                error={Boolean(errors.alias)}
                                helperText={errors.alias ?? (page?.url ? `URL: ${page.url}` : ' ')}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth select label="Родитель"
                                value={data.parent_id ?? ''}
                                onChange={(e) => setData('parent_id', e.target.value)}
                                error={Boolean(errors.parent_id)} helperText={errors.parent_id}
                            >
                                <MenuItem value="">— корень —</MenuItem>
                                {parentOptions.map((option) => (
                                    <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth label="H1"
                                value={data.h1}
                                onChange={(e) => setData('h1', e.target.value)}
                            />
                        </Grid>
                        <Grid size={12}>
                            {MENU_SWITCHES.map(([key, label]) => (
                                <FormControlLabel
                                    key={key}
                                    control={(
                                        <Switch
                                            checked={Boolean(data[key])}
                                            onChange={(e) => setData(key, e.target.checked)}
                                        />
                                    )}
                                    label={label}
                                />
                            ))}
                        </Grid>
                    </Grid>
                </Box>

                <Box hidden={tab !== 1}>
                    <TextField
                        fullWidth multiline minRows={2} label="Анонс" sx={{ mb: 2 }}
                        value={data.announce}
                        onChange={(e) => setData('announce', e.target.value)}
                    />
                    {/* ВАЖНО: пишем в `text`, а не в `content` — так ждёт бэкенд */}
                    <Editor value={data.text} onChange={(html) => setData('text', html)} />
                </Box>

                <Box hidden={tab !== 2}>
                    <Grid container spacing={2} direction="column">
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Title"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                size="small"
                                slotProps={{inputLabel: {shrink: true}}}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Keywords"
                                value={data.keywords}
                                onChange={(e) => setData('keywords', e.target.value)}
                                size="small"
                                slotProps={{inputLabel: {shrink: true}}}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="Description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                multiline
                                rows={4}
                                size="small"
                                slotProps={{inputLabel: {shrink: true}}}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="og_title"
                                value={data.og_title}
                                onChange={(e) => setData('og_title', e.target.value)}
                                size="small"
                                slotProps={{inputLabel: {shrink: true}}}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label="og_description"
                                value={data.og_description}
                                onChange={(e) => setData('og_description', e.target.value)}
                                size="small"
                                slotProps={{inputLabel: {shrink: true}}}
                            />
                        </Grid>
                    </Grid>
                </Box>

                <Box hidden={tab !== 3}>
                    <Box sx={{pt: 2}}>
                        <Typography variant="subtitle1" gutterBottom>Изображения страницы</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{mb: 2, display: 'block'}}>
                            JPEG, PNG, GIF, WebP • Макс. 10MB • Автоконвертация в WebP
                        </Typography>
                        {/*<ImageUploader*/}
                        {/*    key={syncKey}*/}
                        {/*    images={data.images}*/}
                        {/*    pageId={page?.id}*/}
                        {/*    uploadUrl={`/admin/pages/${page?.id || 'new'}/upload-images`}*/}
                        {/*    maxImages={10}*/}
                        {/*    multiple={true}*/}
                        {/*    onChange={handleImagesChange}*/}
                        {/*/>*/}
                    </Box>
                </Box>

                {/* SEO / Изображения — без изменений по логике, только Grid size={} */}
            </CardContent>

            <CardActions sx={{ justifyContent: 'flex-end', borderTop: 1, borderColor: 'divider' }}>
                <Button
                    type="submit" variant="contained" startIcon={<SaveIcon />}
                    loading={processing} disabled={!isDirty}
                >
                    {isEdit ? 'Сохранить' : 'Создать'}
                </Button>
            </CardActions>
        </Card>
    );
}

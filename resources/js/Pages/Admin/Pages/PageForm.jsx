import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
    Tabs,
    Tab,
    IconButton,
    FormHelperText,
    Dialog,
    DialogContent
} from '@mui/material';
import {Add, Save, OpenInNew as OpenInNewIcon, Close as CloseIcon } from '@mui/icons-material';
import RichTextEditor from "@/Pages/Admin/Settings/Fields/RichTextEditor.jsx";
import ImageUploader from '@admin-components/ImageUploader/ImageUploader.jsx';

const PageForm = ({ page, parents, isNew = false }) => {
    const [activeTab, setActiveTab] = useState(0);
    const isInitialized = useRef(false);
    const previousPageId = useRef(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
        reset } = useForm({
        title: page?.title || '',
        slug: page?.slug || '',
        content: page?.content || '',
        parent_id: page?.parent_id || '',
        is_active: page?.is_active !== undefined ? page.is_active : true,
        meta_title: page?.meta_title || '',
        meta_description: page?.meta_description || '',
        template: page?.template || 'default',
        image: null,
        image_preview: page?.single_thumb || null,
        image_src: page?.single_image_src || null,
        images: [], // ID существующих изображений для сохранения порядка
        deleted_images: [], // ID удаленных изображений
        new_images: [], // File объекты новых изображений
    });

    // Инициализация только при первой загрузке или смене страницы
    useEffect(() => {
        const currentPageId = page?.id || 'new';

        // Инициализируем только если страница изменилась
        if (previousPageId.current !== currentPageId) {

            // Получаем ID существующих изображений
            const existingImages = page?.images || [];
            const existingImageIds = existingImages.map(img => {
                if (typeof img === 'object') {
                    return img.original || img.id || img;
                }
                return img;
            });

            reset();
            setData({
                title: page?.title || '',
                slug: page?.slug || '',
                content: page?.content || '',
                parent_id: page?.parent_id || '',
                is_active: page?.is_active !== undefined ? page.is_active : true,
                meta_title: page?.meta_title || '',
                meta_description: page?.meta_description || '',
                template: page?.template || 'default',
                image: null,
                image_preview: page?.single_thumb || null,
                image_src: page?.single_image_src || null,
                images: existingImageIds,
                deleted_images: [],
                new_images: [],
            });

            setActiveTab(0);
            isInitialized.current = true;
            previousPageId.current = currentPageId;
        }
    }, [page?.id, isNew]);

    // Обработчик изображений - ПРИНИМАЕТ ФАЙЛЫ НАПРЯМУЮ
    const handleImagesChange = useCallback((newImagesOrder, newFiles, deletedImageIds) => {
        console.log('🖼️ PageForm.handleImagesChange called with:', {
            order: newImagesOrder,
            newFilesCount: newFiles?.length || 0,
            deleted: deletedImageIds
        });

        // Обновляем состояние НАПРЯМУЮ через setData
        setData(prevData => {
            const updatedData = {
                ...prevData,
                images: newImagesOrder,
                deleted_images: [...(prevData.deleted_images || []), ...(deletedImageIds || [])]
            };

            // ПРЯМО устанавливаем new_images из переданных файлов
            if (newFiles && newFiles.length > 0) {
                updatedData.new_images = [...newFiles];
                console.log('🖼️ Setting new_images directly:', updatedData.new_images.map(f => ({
                    name: f.name,
                    isFile: f instanceof File,
                    size: f.size
                })));
            } else if (newFiles && newFiles.length === 0) {
                // Если файлов нет, но есть существующие - сохраняем их
                // Если файлов нет и не было - очищаем
                if (prevData.new_images && prevData.new_images.length > 0) {
                    // Проверяем, есть ли еще новые изображения в localImages
                    const hasNewImages = newImagesOrder.some(id => typeof id === 'string' && id.startsWith('new_'));
                    if (!hasNewImages) {
                        console.log('🖼️ Clearing new_images - no new images in order');
                        updatedData.new_images = [];
                    }
                }
            }

            return updatedData;
        });
    }, [setData]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (data.new_images && data.new_images.length > 0) {
            data.new_images.forEach((file, i) => {
                console.log(`📊 File ${i}:`, {
                    name: file.name,
                    isFile: file instanceof File,
                    size: file?.size,
                    type: file?.type
                });
            });
        }

        // Создаем FormData
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('slug', data.slug);
        formData.append('content', data.content || '');
        formData.append('parent_id', data.parent_id || '');
        formData.append('is_active', data.is_active ? '1' : '0');
        formData.append('meta_title', data.meta_title || '');
        formData.append('meta_description', data.meta_description || '');
        formData.append('template', data.template || 'default');
        formData.append('images', JSON.stringify(data.images));
        formData.append('deleted_images', JSON.stringify(data.deleted_images || []));

        // Добавляем изображение страницы
        if (data.image instanceof File) {
            formData.append('image', data.image);
        }

        // Добавляем новые изображения
        if (data.new_images && data.new_images.length > 0) {
            console.log('📎 Adding new_images to FormData:');
            data.new_images.forEach((file, index) => {
                if (file instanceof File) {
                    formData.append('new_images[]', file, file.name);
                } else {
                    console.error(`❌ Invalid file at index ${index}:`, file);
                }
            });
        }

        if (!isNew) {
            formData.append('_method', 'PUT');
        }

        const url = isNew ? '/admin/api/pages' : `/admin/api/pages/${page.id}`;

        router.post(url, formData, {
            forceFormData: false,
            preserveScroll: true,
            preserveState: !isNew,
            onSuccess: (page) => {
                console.log('✅ Operation successful');
                if (!isNew) {
                    setData(prev => ({
                        ...prev,
                        deleted_images: [],
                        new_images: []
                    }));
                }
            },
            onError: (errors) => {
                console.error('❌ Submit error:', errors);
            }
        });
    };

    const handleTitleChange = (event) => {
        const title = event.target.value;
        setData('title', title);
        if (!data.slug || data.slug === slugify(page?.title || '')) {
            setData('slug', slugify(title));
        }
    };

    const slugify = (text) => {
        if (!text) return '';
        return text.toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-');
    };

    const handleChange = (field) => (event) => {
        setData(field, event.target.value);
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                    {isNew ? 'Новая страница' : page?.title || 'Редактирование страницы'}
                    {page?.url && (
                        <IconButton component="a" href={page.url} target="_blank" size="small" color="primary">
                            <OpenInNewIcon fontSize="small" />
                        </IconButton>
                    )}
                </Typography>
                <FormControlLabel
                    control={<Switch checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} size="small" color="success" />}
                    label={data.is_active ? "Активна" : "Выключена"}
                    labelPlacement="start"
                />
            </Box>

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tab label="Параметры" />
                <Tab label="Текст" />
                <Tab label="Изображения" />
            </Tabs>

            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {activeTab === 0 && (
                    <Grid container spacing={2} sx={{ pt: 2 }} direction="column">
                        <Grid item xs={12}>
                            <TextField fullWidth label="Название" value={data.title}
                                       onChange={handleTitleChange} error={!!errors.title}
                                       helperText={errors.title} required size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Slug" value={data.slug}
                                       onChange={handleChange('slug')}
                                       error={!!errors.slug} helperText={errors.slug || "Автоматически из названия"} size="small" />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Meta Title" value={data.meta_title}
                                       onChange={handleChange('meta_title')}
                                       error={!!errors.meta_title} size="small"
                                       slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Meta Description" value={data.meta_description}
                                       onChange={handleChange('meta_description')}
                                       error={!!errors.meta_description} multiline rows={4} size="small"
                                       slotProps={{ inputLabel: { shrink: true } }} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth error={!!errors.template} size="small">
                                <InputLabel>Шаблон</InputLabel>
                                <Select value={data.template}
                                        onChange={handleChange('template')} label="Шаблон">
                                    <MenuItem value="default">По умолчанию</MenuItem>
                                    <MenuItem value="home">Главная</MenuItem>
                                    <MenuItem value="contact">Контакты</MenuItem>
                                    <MenuItem value="blog">Блог</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth error={!!errors.parent_id} size="small">
                                <InputLabel>Родительская страница</InputLabel>
                                <Select value={data.parent_id}
                                        onChange={handleChange('parent_id')} label="Родительская страница">
                                    <MenuItem value="">Нет (Корневая)</MenuItem>
                                    {parents?.map(p => <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        {/**/}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>Изображение страницы</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                {/* Preview */}
                                <Box
                                    sx={{
                                        width: 150,
                                        height: 150,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        position: 'relative',
                                        cursor: (data.image_preview || data.image) ? 'pointer' : 'default',
                                        bgcolor: 'grey.100',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                    onClick={() => {
                                        if (data.image_preview || data.image) {
                                            setPreviewOpen(true);
                                        }
                                    }}
                                >
                                    {data.image_preview || data.image ? (
                                        <img
                                            src={
                                                data.image instanceof File
                                                    ? URL.createObjectURL(data.image)
                                                    : data.image_preview
                                            }
                                            alt="Preview"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">
                                            Нет изображения
                                        </Typography>
                                    )}
                                </Box>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        component="label"
                                    >
                                        {data.image_preview || data.image ? 'Заменить' : 'Загрузить'}
                                        <input
                                            type="file"
                                            hidden
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setData(prev => ({
                                                        ...prev,
                                                        image: file,
                                                        image_preview: URL.createObjectURL(file),
                                                    }));
                                                }
                                            }}
                                        />
                                    </Button>
                                    {(data.image_preview || data.image) && (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            color="error"
                                            onClick={() => {
                                                setData(prev => ({
                                                    ...prev,
                                                    image: null,
                                                    image_preview: null,
                                                    image_src: null,
                                                }));
                                            }}
                                        >
                                            Удалить
                                        </Button>
                                    )}
                                    <Typography variant="caption" color="text.secondary">
                                        JPEG, PNG, GIF, WebP • Макс. 10MB
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Dialog для просмотра полного изображения */}
                            <Dialog
                                open={previewOpen}
                                onClose={() => setPreviewOpen(false)}
                                maxWidth="lg"
                                fullWidth
                            >
                                <DialogContent sx={{ p: 0, position: 'relative' }}>
                                    <IconButton
                                        onClick={() => setPreviewOpen(false)}
                                        sx={{
                                            position: 'absolute',
                                            right: 8,
                                            top: 8,
                                            bgcolor: 'rgba(0,0,0,0.5)',
                                            color: 'white',
                                            '&:hover': {
                                                bgcolor: 'rgba(0,0,0,0.7)',
                                            },
                                            zIndex: 1,
                                        }}
                                    >
                                        <CloseIcon />
                                    </IconButton>
                                    <img
                                        src={
                                            data.image instanceof File
                                                ? URL.createObjectURL(data.image)
                                                : data.image_src
                                        }
                                        alt="Полное изображение"
                                        style={{
                                            width: '100%',
                                            height: 'auto',
                                            maxHeight: '90vh',
                                            objectFit: 'contain',
                                            display: 'block',
                                        }}
                                    />
                                </DialogContent>
                            </Dialog>
                        </Grid>
                    </Grid>
                )}

                {activeTab === 1 && (
                    <Grid container spacing={2} sx={{ pt: 2 }}>
                        <FormControl fullWidth variant="outlined">
                            <InputLabel shrink>Содержание</InputLabel>
                            <Box sx={{ mt: 1 }}>
                                <RichTextEditor value={data.content}
                                                onChange={handleChange('content')} />
                            </Box>
                            {errors.content && <FormHelperText error>{errors.content}</FormHelperText>}
                        </FormControl>
                    </Grid>
                )}

                {activeTab === 2 && (
                    <Box sx={{ pt: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>Изображения страницы</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                            JPEG, PNG, GIF, WebP • Макс. 10MB • Автоконвертация в WebP
                        </Typography>

                        <ImageUploader
                            key={page?.id || 'new'}
                            images={data.images}
                            pageId={page?.id}
                            uploadUrl={`/admin/pages/${page?.id || 'new'}/upload-images`}
                            maxImages={10}
                            multiple={true}
                            onChange={handleImagesChange}
                        />
                    </Box>
                )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2, mt: 'auto', borderTop: 1, borderColor: 'divider' }}>
                <Button type="submit" variant="contained"
                        startIcon={isNew ? <Add /> : <Save />} disabled={processing}>
                    {processing ? 'Сохранение...' : isNew ? 'Создать' : 'Сохранить'}
                </Button>
            </Box>
        </Box>
    );
};

export default PageForm;

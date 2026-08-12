import React, {useState, useEffect, useCallback, useRef} from 'react';
import {useForm, router} from '@inertiajs/react';
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
    DialogContent,
    Tooltip,
    Divider,
    Chip
} from '@mui/material';
import {
    Add,
    Save,
    OpenInNew as OpenInNewIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    ZoomIn as ZoomInIcon,
    CloudUpload as CloudUploadIcon,
    SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import RichTextEditor from "@/Pages/Admin/Settings/Fields/RichTextEditor.jsx";
import ImageUploader from '@admin-components/ImageUploader/ImageUploader.jsx';

const PageForm = ({page, parents, isNew = false}) => {
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
        reset
    } = useForm({
        name: page?.name || '',
        h1: page?.h1 || '',
        alias: page?.alias || '',
        slug: page?.slug || '',
        announce: page?.announce || '',
        text: page?.text || '',
        parent_id: page?.parent_id || '',
        published: page?.published !== undefined ? page.published : true,
        on_main: page?.on_main !== undefined ? page.on_main : false,
        on_header_menu: page?.on_header_menu !== undefined ? page.on_header_menu : false,
        on_footer_menu: page?.on_footer_menu !== undefined ? page.on_footer_menu : false,
        on_mobile_menu: page?.on_mobile_menu !== undefined ? page.on_mobile_menu : false,
        title: page?.title || '',
        keywords: page?.keywords || '',
        description: page?.description || '',
        og_title: page?.og_title || '',
        og_description: page?.og_description || '',
        image: null,
        image_preview: page?.single_thumb || null,
        image_src: page?.single_image_src || null,
        images: [],
        deleted_images: [],
        new_images: [],
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
                name: page?.name || '',
                h1: page?.h1 || '',
                alias: page?.alias || '',
                slug: page?.slug || '',
                announce: page?.announce || '',
                text: page?.text || '',
                parent_id: page?.parent_id || '',
                published: page?.published !== undefined ? page.published : true,
                on_main: page?.on_main !== undefined ? page.on_main : false,
                on_header_menu: page?.on_header_menu !== undefined ? page.on_header_menu : false,
                on_footer_menu: page?.on_footer_menu !== undefined ? page.on_footer_menu : false,
                on_mobile_menu: page?.on_mobile_menu !== undefined ? page.on_mobile_menu : false,
                title: page?.title || '',
                keywords: page?.keywords || '',
                description: page?.description || '',
                og_title: page?.og_title || '',
                og_description: page?.og_description || '',
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
            } else if (newFiles && newFiles.length === 0) {
                // Если файлов нет, но есть существующие - сохраняем их
                // Если файлов нет и не было - очищаем
                if (prevData.new_images && prevData.new_images.length > 0) {
                    // Проверяем, есть ли еще новые изображения в localImages
                    const hasNewImages = newImagesOrder.some(id => typeof id === 'string' && id.startsWith('new_'));
                    if (!hasNewImages) {
                        updatedData.new_images = [];
                    }
                }
            }

            return updatedData;
        });
    }, [setData]);

    const handleSubmit = (e) => {
        e.preventDefault();

        // Создаем FormData
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('h1', data.h1);
        formData.append('alias', data.alias);
        formData.append('slug', data.slug);
        formData.append('text', data.text || '');
        formData.append('parent_id', data.parent_id || '');
        formData.append('published', data.published ? '1' : '0');
        formData.append('title', data.title || '');
        formData.append('keywords', data.keywords || '');
        formData.append('description', data.description || '');
        formData.append('og_title', data.og_title || '');
        formData.append('og_description', data.og_description || '');
        formData.append('images', JSON.stringify(data.images));
        formData.append('deleted_images', JSON.stringify(data.deleted_images || []));

        // Если изображение удалено, отправляем пустую строку
        if (data.image_deleted) {
            formData.append('image_deleted', true); // или можно отправить специальный параметр
        } else if (data.image instanceof File) {
            formData.append('image', data.image);
        }

        // Добавляем новые изображения
        if (data.new_images && data.new_images.length > 0) {
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
        const name = event.target.value;
        setData('name', name);
        if (!data.alias || data.alias === slugify(page?.name || '')) {
            setData('alias', slugify(name));
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
        <Box component="form" onSubmit={handleSubmit} sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                <Typography variant="h6">
                    {isNew ? 'Новая страница' : page?.name || 'Редактирование страницы'}
                    {page?.url && (
                        <IconButton component="a" href={page.url} target="_blank" size="small" color="primary">
                            <OpenInNewIcon fontSize="small"/>
                        </IconButton>
                    )}
                </Typography>
                <FormControlLabel
                    control={<Switch checked={data.published} onChange={(e) => setData('published', e.target.checked)}
                                     size="small" color="success"/>}
                    label={data.published ? "Активна" : "Выключена"}
                    labelPlacement="start"
                />
            </Box>

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}
                  sx={{borderBottom: 1, borderColor: 'divider', mb: 2}}>
                <Tab label="Параметры"/>
                <Tab label="Текст"/>
                <Tab label="Изображения"/>
            </Tabs>

            <Box sx={{flex: 1, overflow: 'auto'}}>
                {activeTab === 0 && (
                    <Box sx={{ pr: 2 }}>
                        <Box sx={{display: 'flex', gap: 3, pt: 2}}>
                            {/* Левая колонка 75% */}
                            <Box sx={{flex: 3}}>
                                <Grid container spacing={2} direction="column">
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Название"
                                            value={data.name}
                                            onChange={handleTitleChange}
                                            error={!!errors.name}
                                            helperText={errors.name}
                                            required
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="H1"
                                            value={data.h1}
                                            onChange={handleChange('h1')}
                                            error={!!errors.h1}
                                            helperText={errors.h1}
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Alias"
                                            value={data.alias}
                                            onChange={handleChange('alias')}
                                            error={!!errors.alias}
                                            helperText={errors.alias || "Автоматически из названия"}
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <FormControl fullWidth error={!!errors.parent_id} size="small">
                                            <InputLabel>Родительская страница</InputLabel>
                                            <Select
                                                value={data.parent_id}
                                                onChange={handleChange('parent_id')}
                                                label="Родительская страница"
                                                variant="outlined">
                                                <MenuItem value="">Нет (Корневая)</MenuItem>
                                                {parents?.map(p => (
                                                    <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Правая колонка 25% - Изображение */}
                            <Box sx={{flex: 1}}>
                                <Box
                                    sx={{
                                        position: 'relative',
                                        width: '100%',
                                        aspectRatio: '1/1',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        bgcolor: 'grey.100',
                                        border: '2px dashed',
                                        borderColor: data.image_preview || data.image ? 'transparent' : 'grey.300',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            borderColor: data.image_preview || data.image ? 'transparent' : 'primary.main',
                                            bgcolor: data.image_preview || data.image ? 'transparent' : 'grey.200',
                                        },
                                    }}
                                >
                                    {/* Превью изображения */}
                                    {(data.image_preview || data.image) ? (
                                        <>
                                            <img
                                                src={
                                                    data.image instanceof File
                                                        ? URL.createObjectURL(data.image)
                                                        : data.image_preview
                                                }
                                                alt="Preview"
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                }}
                                                onClick={() => setPreviewOpen(true)}
                                            />

                                            {/* Оверлей с кнопкой удаления при наведении */}
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    bgcolor: 'rgba(0,0,0,0.4)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 1,
                                                    opacity: 0,
                                                    transition: 'opacity 0.2s ease',
                                                    '&:hover': {
                                                        opacity: 1,
                                                    },
                                                }}
                                            >
                                                <Tooltip title="Просмотр">
                                                    <IconButton
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewOpen(true);
                                                        }}
                                                        sx={{
                                                            bgcolor: 'white',
                                                            '&:hover': {bgcolor: 'grey.100'},
                                                        }}
                                                        size="small"
                                                    >
                                                        <ZoomInIcon fontSize="small" sx={{color: 'grey.800'}}/>
                                                    </IconButton>
                                                </Tooltip>

                                                <Tooltip title="Удалить">
                                                    <IconButton
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setData(prev => ({
                                                                ...prev,
                                                                image: null,
                                                                image_preview: null,
                                                                image_src: null,
                                                                image_deleted: true,
                                                            }));
                                                        }}
                                                        sx={{
                                                            bgcolor: 'error.main',
                                                            color: 'white',
                                                            '&:hover': {bgcolor: 'error.dark'},
                                                        }}
                                                        size="small"
                                                    >
                                                        <DeleteIcon fontSize="small"/>
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>

                                            {/* Кнопка замены */}
                                            <Button
                                                component="label"
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 8,
                                                    right: 8,
                                                    minWidth: 'auto',
                                                    bgcolor: 'rgba(255,255,255,0.9)',
                                                    backdropFilter: 'blur(4px)',
                                                    '&:hover': {
                                                        bgcolor: 'white',
                                                    },
                                                    px: 2,
                                                    py: 0.5,
                                                    fontSize: '0.75rem',
                                                    borderRadius: 1,
                                                    opacity: 0.9,
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                }}
                                            >
                                                <SwapHorizIcon sx={{fontSize: 16, mr: 0.5}}/>
                                                Заменить
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
                                                                image_deleted: false,
                                                            }));
                                                        }
                                                    }}
                                                />
                                            </Button>
                                        </>
                                    ) : (
                                        /* Зона загрузки */
                                        <Button
                                            component="label"
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 1,
                                                textTransform: 'none',
                                                bgcolor: 'background.default',
                                                border: '2px dashed',
                                                borderColor: 'divider',
                                                '&:hover': {
                                                    bgcolor: 'action.hover',
                                                    borderColor: 'primary.main',
                                                },
                                            }}
                                        >
                                            <CloudUploadIcon sx={{fontSize: 48, color: 'text.secondary'}}/>
                                            <Typography variant="body2" sx={{fontWeight: 500, color: 'text.primary'}}>
                                                Загрузить фото
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                JPEG, PNG, WebP • Макс. 10MB
                                            </Typography>
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
                                                            image_deleted: false,
                                                        }));
                                                    }
                                                }}
                                            />
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={{ mt:2 }}>
                            <Divider sx={{ mb: 2}}>
                                <Chip label="Meta" size="small" />
                            </Divider>
                            <Grid container spacing={2} direction="column">
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Title"
                                        value={data.title}
                                        onChange={handleChange('title')}
                                        error={!!errors.title}
                                        size="small"
                                        slotProps={{inputLabel: {shrink: true}}}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Keywords"
                                        value={data.keywords}
                                        onChange={handleChange('keywords')}
                                        error={!!errors.keywords}
                                        size="small"
                                        slotProps={{inputLabel: {shrink: true}}}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Description"
                                        value={data.description}
                                        onChange={handleChange('description')}
                                        error={!!errors.description}
                                        multiline
                                        rows={4}
                                        size="small"
                                        slotProps={{inputLabel: {shrink: true}}}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="og_title"
                                        value={data.og_title}
                                        onChange={handleChange('og_title')}
                                        error={!!errors.og_title}
                                        size="small"
                                        slotProps={{inputLabel: {shrink: true}}}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="og_description"
                                        value={data.og_description}
                                        onChange={handleChange('og_description')}
                                        error={!!errors.og_description}
                                        size="small"
                                        slotProps={{inputLabel: {shrink: true}}}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    </Box>
                )}

                {activeTab === 1 && (
                    <Grid container spacing={2} sx={{pt: 2}}>
                        <FormControl fullWidth variant="outlined">
                            <InputLabel shrink>Содержание</InputLabel>
                            <Box sx={{mt: 1}}>
                                <RichTextEditor
                                    value={data.content}
                                    onChange={handleChange('content')}
                                />
                            </Box>
                            {errors.content && (
                                <FormHelperText error>{errors.content}</FormHelperText>
                            )}
                        </FormControl>
                    </Grid>
                )}

                {activeTab === 2 && (
                    <Box sx={{pt: 2}}>
                        <Typography variant="subtitle1" gutterBottom>Изображения страницы</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{mb: 2, display: 'block'}}>
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

                {/* Dialog для просмотра полного изображения */}
                <Dialog
                    open={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    maxWidth="lg"
                    fullWidth
                >
                    <DialogContent sx={{p: 0, position: 'relative'}}>
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
                            <CloseIcon/>
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
            </Box>

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
                    startIcon={isNew ? <Add/> : <Save/>}
                    disabled={processing}
                >
                    {processing ? 'Сохранение...' : isNew ? 'Создать' : 'Сохранить'}
                </Button>
            </Box>
        </Box>
    );
};

export default PageForm;

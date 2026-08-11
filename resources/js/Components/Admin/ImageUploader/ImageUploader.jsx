import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import { useDropzone } from 'react-dropzone';
import {
    Box,
    Typography,
    IconButton,
    Dialog,
    DialogContent,
    Snackbar,
    Alert,
    LinearProgress,
    Button,
    Tooltip,
    Paper,
    CardMedia
} from '@mui/material';
import {
    Upload as UploadIcon,
    ZoomIn as ZoomIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIndicatorIcon,
    Add as AddIcon
} from '@mui/icons-material';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Отдельный компонент для перетаскиваемого изображения
 */
const SortableImage = ({ id, image, index, onDelete, onPreview, isDragging, getDisplayUrl }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        position: 'relative',
    };

    const displayUrl = getDisplayUrl(image, 'thumb');
    const largeUrl = getDisplayUrl(image, 'large');

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Paper
                elevation={0}
                sx={{
                    border: '1px solid',
                    borderColor: isDragging ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: '0 0 0 1px rgba(25, 118, 210, 0.3)',
                    },
                }}
            >
                {/* Контейнер изображения */}
                <Box sx={{
                    position: 'relative',
                    height: 164,
                    overflow: 'hidden',
                }}>
                    <CardMedia
                        component="img"
                        height="164"
                        image={displayUrl}
                        alt={`Image ${index + 1}`}
                        sx={{
                            objectFit: 'cover',
                            cursor: 'pointer',
                            width: '100%',
                            height: '100%',
                        }}
                        onClick={() => onPreview(largeUrl)}
                        onError={(e) => {
                            e.target.src = '/placeholder.jpg';
                        }}
                    />

                    {/* Кнопки действий сверху */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            p: 0.5,
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
                            zIndex: 2,
                        }}
                    >
                        {/* Индикатор WebP */}
                        {image?.thumbs?.thumb_webp && (
                            <Box
                                sx={{
                                    bgcolor: 'success.main',
                                    color: 'white',
                                    px: 0.5,
                                    py: 0.2,
                                    borderRadius: 0.5,
                                    fontSize: '0.65rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.3,
                                }}
                            >
                                WebP
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                            <Tooltip title="Переместить">
                                <IconButton
                                    {...listeners}
                                    sx={{
                                        color: 'white',
                                        cursor: 'grab',
                                        '&:active': { cursor: 'grabbing' },
                                        padding: 0.5,
                                    }}
                                    size="small"
                                >
                                    <DragIndicatorIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Предпросмотр">
                                <IconButton
                                    sx={{ color: 'white', padding: 0.5 }}
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPreview(largeUrl);
                                    }}
                                >
                                    <ZoomIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Удалить">
                                <IconButton
                                    sx={{ color: 'white', padding: 0.5 }}
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Передаем index, а не id
                                        onDelete(index);
                                    }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </div>
    );
};

/**
 * Компонент Dropzone
 */
const DropzoneArea = ({ isDragActive, uploading, getRootProps, getInputProps, multiple, maxImages, currentCount }) => (
    <Box
        {...getRootProps()}
        sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            borderRadius: 1,
            p: 3,
            mb: 2,
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.7 : 1,
            bgcolor: isDragActive ? 'action.hover' : 'transparent',
            transition: 'all 0.2s',
            '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
            },
        }}
    >
        <input {...getInputProps()} />
        {uploading ? (
            <Box>
                <LinearProgress sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                    Загрузка...
                </Typography>
            </Box>
        ) : (
            <>
                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                    {isDragActive
                        ? 'Отпустите файлы для загрузки'
                        : 'Перетащите изображения сюда или кликните для выбора'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Поддерживаются JPEG, PNG, GIF, WebP • Макс. 10MB •
                    {multiple ? ` Можно загрузить до ${maxImages} изображений` : ' Одно изображение'}
                </Typography>
                {currentCount >= maxImages && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                        Достигнут лимит изображений ({maxImages})
                    </Typography>
                )}
            </>
        )}
    </Box>
);

/**
 * Основной компонент ImageUploader
 */
const ImageUploader = ({
                           images: initialImages = [],
                           pageId,
                           uploadUrl,
                           maxImages = 10,
                           multiple = true,
                           onChange
                       }) => {
    const [originalImages, setOriginalImages] = useState(initialImages || []);
    const [uploading, setUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [deletedImages, setDeletedImages] = useState([]);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
    const [activeDragId, setActiveDragId] = useState(null);

    const { props } = usePage();

    // Настройка сенсоров для DnD
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Отслеживаем flash-сообщения от сервера
    useEffect(() => {
        if (props.flash?.success) {
            setNotification({
                open: true,
                message: props.flash.success,
                severity: 'success'
            });
        }
        if (props.flash?.error) {
            setNotification({
                open: true,
                message: props.flash.error,
                severity: 'error'
            });
        }
    }, [props.flash]);

    // Синхронизация с родительским компонентом
    useEffect(() => {
        if (onChange) {
            onChange(originalImages, deletedImages);
        }
    }, [originalImages, deletedImages]);

    // Массив уникальных ID для SortableContext (используем index, так как объекты могут не иметь id)
    const sortableIds = useMemo(() => {
        return originalImages.map((_, index) => `image-${index}`);
    }, [originalImages]);

    // Обработка загрузки файлов через fetch
    const handleUpload = useCallback(async (acceptedFiles) => {
        if (!multiple && originalImages.length >= 1) return;
        if (multiple && originalImages.length >= maxImages) return;

        setUploading(true);

        const formData = new FormData();

        if (multiple) {
            acceptedFiles.forEach((file) => {
                formData.append('images[]', file);
            });
        } else {
            formData.append('images[]', acceptedFiles[0]);
        }

        try {
            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData,
            });

            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();

                if (data.success && data.images) {
                    // Добавляем новые изображения к существующим
                    setOriginalImages(prev => [...prev, ...data.images]);
                    setNotification({
                        open: true,
                        message: data.message || `Загружено файлов: ${acceptedFiles.length}`,
                        severity: 'success'
                    });
                } else {
                    throw new Error(data.message || 'Upload failed');
                }
            } else {
                const text = await response.text();
                console.error('Unexpected response:', text);
                throw new Error('Server returned non-JSON response');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            setNotification({
                open: true,
                message: 'Ошибка при загрузке изображений: ' + error.message,
                severity: 'error'
            });
        } finally {
            setUploading(false);
        }
    }, [originalImages, multiple, maxImages, uploadUrl]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: handleUpload,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
        },
        multiple: multiple,
        maxFiles: maxImages - originalImages.length,
        disabled: uploading || originalImages.length >= maxImages,
    });

    // Обработчик завершения перетаскивания
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over || active.id === over.id) return;

        const oldIndex = sortableIds.indexOf(active.id);
        const newIndex = sortableIds.indexOf(over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const newImages = arrayMove([...originalImages], oldIndex, newIndex);
            setOriginalImages(newImages);
            setNotification({
                open: true,
                message: 'Порядок изображений изменен. Не забудьте сохранить изменения.',
                severity: 'success'
            });
        }
    }, [originalImages, sortableIds]);

    // Удаление изображения по индексу
    const handleDelete = useCallback((index) => {
        if (index < 0 || index >= originalImages.length) return;

        setDeletedImages(prev => [...prev, index]);
        const newImages = originalImages.filter((_, i) => i !== index);
        setOriginalImages(newImages);
        setNotification({
            open: true,
            message: 'Изображение будет удалено при сохранении',
            severity: 'info'
        });
    }, [originalImages]);

    // Получение URL изображения ДЛЯ ОТОБРАЖЕНИЯ
    const getDisplayUrl = useCallback((image, size = 'medium') => {
        if (!image) return '/placeholder.jpg';

        // Если это строка (относительный путь) - для обратной совместимости
        if (typeof image === 'string') {
            if (image.startsWith('http')) return image;
            return image.startsWith('/') ? image : `/storage/${image}`;
        }

        console.log(image);

        // Для объекта с полной структурой
        if (image) {
            let path = null;

            switch(size) {
                case 'thumb':
                    path = image.thumb_webp || image.thumb;
                    break;
                case 'small':
                    path = image.small_webp || image.small;
                    break;
                case 'medium':
                    path = image.medium_webp || image.medium;
                    break;
                case 'large':
                    path = image.large_webp || image.large;
                    break;
                default:
                    path = image.medium_webp || image.medium;
            }

            if (path) {
                // Если путь уже абсолютный (начинается с http или /)
                if (path.startsWith('http')) return path;
                if (path.startsWith('/')) return path;
                // Иначе добавляем /storage/
                return `/storage/${path}`;
            }
        }

        // Fallback: пробуем другие поля
        let path = image.webp || image.original || image.url;

        if (!path) return '/placeholder.jpg';

        if (path.startsWith('http')) return path;
        if (path.startsWith('/')) return path;
        return `/storage/${path}`;
    }, []);

    // Активное изображение для DragOverlay
    const activeImage = useMemo(() => {
        if (!activeDragId) return null;
        const index = sortableIds.indexOf(activeDragId);
        return index !== -1 ? originalImages[index] : null;
    }, [activeDragId, sortableIds, originalImages]);

    return (
        <Box>
            {/* Dropzone */}
            {originalImages.length < maxImages && (
                <DropzoneArea
                    isDragActive={isDragActive}
                    uploading={uploading}
                    getRootProps={getRootProps}
                    getInputProps={getInputProps}
                    multiple={multiple}
                    maxImages={maxImages}
                    currentCount={originalImages.length}
                />
            )}

            {/* Счетчик изображений */}
            {originalImages.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Загружено: {originalImages.length} из {maxImages}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        🖱️ Перетаскивайте для изменения порядка
                    </Typography>
                </Box>
            )}

            {/* Сетка изображений с DnD */}
            {originalImages.length > 0 && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(e) => setActiveDragId(e.active.id)}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveDragId(null)}
                >
                    <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: 'repeat(2, 1fr)',
                                    sm: 'repeat(3, 1fr)',
                                    md: 'repeat(4, 1fr)',
                                    lg: 'repeat(5, 1fr)',
                                },
                                gap: 1.5,
                                mb: 2,
                            }}
                        >
                            {originalImages.map((image, index) => {
                                const imageId = sortableIds[index];
                                return (
                                    <SortableImage
                                        key={imageId}
                                        id={imageId}
                                        image={image}
                                        index={index}
                                        onDelete={handleDelete}
                                        onPreview={setPreviewImage}
                                        isDragging={activeDragId === imageId}
                                        getDisplayUrl={getDisplayUrl}
                                    />
                                );
                            })}
                        </Box>
                    </SortableContext>

                    {/* Оверлей для перетаскиваемого изображения */}
                    <DragOverlay>
                        {activeImage ? (
                            <Box sx={{ width: '100%', maxWidth: 250, opacity: 0.8 }}>
                                <CardMedia
                                    component="img"
                                    height="160"
                                    image={getDisplayUrl(activeImage, 'medium')}
                                    alt="Dragging"
                                    sx={{ objectFit: 'cover', borderRadius: 1, boxShadow: 3 }}
                                />
                            </Box>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            {/* Пустое состояние */}
            {originalImages.length === 0 && !uploading && (
                <Box
                    sx={{
                        textAlign: 'center',
                        py: 4,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        border: '1px dashed',
                        borderColor: 'grey.300',
                    }}
                >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Нет загруженных изображений
                    </Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => document.querySelector('input[type="file"]')?.click()}
                    >
                        Загрузить изображения
                    </Button>
                </Box>
            )}

            {/* Диалог предпросмотра */}
            <Dialog
                open={!!previewImage}
                onClose={() => setPreviewImage(null)}
                maxWidth="lg"
                fullWidth
            >
                <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
                    {previewImage && (
                        <img
                            src={previewImage}
                            alt="Preview"
                            style={{
                                width: '100%',
                                maxHeight: '85vh',
                                objectFit: 'contain',
                            }}
                            onError={(e) => {
                                e.target.src = '/placeholder.jpg';
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Уведомления */}
            <Snackbar
                open={notification.open}
                autoHideDuration={4000}
                onClose={() => setNotification({ ...notification, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setNotification({ ...notification, open: false })}
                    severity={notification.severity}
                    variant="filled"
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ImageUploader;

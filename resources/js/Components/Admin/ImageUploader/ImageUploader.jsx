import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { useDropzone } from 'react-dropzone';
import {
    Box, Paper, CardMedia, IconButton, Tooltip, Typography,
    LinearProgress, Dialog, DialogContent, Snackbar, Alert, Button
} from '@mui/material';
import {
    DndContext, closestCenter, PointerSensor,
    useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext, useSortable,
    rectSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ZoomIcon from '@mui/icons-material/ZoomOutMap';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';
import AddIcon from '@mui/icons-material/Add';

const SortableImage = ({ id, image, index, onDelete, onPreview, isDragging, getDisplayUrl }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

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
            <Paper elevation={0} sx={{
                border: '1px solid',
                borderColor: isDragging ? 'primary.main' : 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: '0 0 0 1px rgba(25, 118, 210, 0.3)',
                },
            }}>
                <Box sx={{ position: 'relative', height: 164, overflow: 'hidden' }}>
                    <CardMedia
                        component="img"
                        height="164"
                        image={displayUrl}
                        alt={`Image ${index + 1}`}
                        sx={{ objectFit: 'cover', cursor: 'pointer', width: '100%', height: '100%' }}
                        onClick={() => onPreview(largeUrl)}
                        onError={(e) => { e.target.src = '/placeholder.jpg'; }}
                    />
                    <Box sx={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'flex-start', p: 0.5,
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
                        zIndex: 2,
                    }}>
                        {image?.thumb_webp && (
                            <Box sx={{
                                bgcolor: 'success.main', color: 'white',
                                px: 0.5, py: 0.2, borderRadius: 0.5,
                                fontSize: '0.65rem',
                            }}>
                                WebP
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                            <Tooltip title="Переместить">
                                <IconButton {...listeners} sx={{ color: 'white', cursor: 'grab', padding: 0.5 }} size="small">
                                    <DragIndicatorIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Предпросмотр">
                                <IconButton sx={{ color: 'white', padding: 0.5 }} size="small"
                                            onClick={(e) => { e.stopPropagation(); onPreview(largeUrl); }}>
                                    <ZoomIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                                <IconButton sx={{ color: 'white', padding: 0.5 }} size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(index);
                                            }}>
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

const DropzoneArea = ({ isDragActive, uploading, getRootProps, getInputProps, maxImages, currentCount }) => (
    <Box {...getRootProps()} sx={{
        border: '2px dashed', borderColor: isDragActive ? 'primary.main' : 'grey.300',
        borderRadius: 1, p: 3, mb: 2, textAlign: 'center',
        cursor: uploading ? 'not-allowed' : 'pointer',
        opacity: uploading ? 0.7 : 1,
        bgcolor: isDragActive ? 'action.hover' : 'transparent',
        transition: 'all 0.2s',
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
    }}>
        <input {...getInputProps()} />
        {uploading ? (
            <Box>
                <LinearProgress sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Загрузка...</Typography>
            </Box>
        ) : (
            <>
                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                    {isDragActive ? 'Отпустите файлы для загрузки' : 'Перетащите изображения сюда или кликните для выбора'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    JPEG, PNG, GIF, WebP • Макс. 10MB • До {maxImages} изображений
                </Typography>
            </>
        )}
    </Box>
);

const ImageUploader = ({
                           images: externalImages = [],
                           pageId,
                           uploadUrl,
                           maxImages = 10,
                           multiple = true,
                           onChange
                       }) => {
    const [localImages, setLocalImages] = useState([]);
    const [newFiles, setNewFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [deletedImageIds, setDeletedImageIds] = useState([]);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
    const [activeDragId, setActiveDragId] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Сохраняем onChange в ref чтобы избежать проблем с замыканием
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Инициализация из внешних данных
    useEffect(() => {
        if (!isInitialized) {
            if (externalImages && externalImages.length > 0) {
                setLocalImages([...externalImages]);
            } else {
                setLocalImages([]);
            }
            setNewFiles([]);
            setDeletedImageIds([]);
            setIsInitialized(true);
        }
    }, [externalImages, isInitialized]);

    // Функция для отправки данных родителю
    const notifyParent = useCallback((images, files, deleted) => {
        if (onChangeRef.current) {
            const imageOrder = images.map(img => {
                if (img.isNew) return `new_${img.tempId}`;
                return typeof img === 'object' ? (img.original || img.id) : img;
            });

            onChangeRef.current(imageOrder, files, deleted);
        }
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const sortableIds = useMemo(() =>
            localImages.map((img, index) => {
                if (img.isNew) return `new-${img.tempId}`;
                return `img-${index}`;
            }),
        [localImages]
    );

    // Загрузка новых файлов
    const handleUpload = useCallback((acceptedFiles) => {
        if (localImages.length + acceptedFiles.length > maxImages) {
            setNotification({
                open: true,
                message: `Максимум ${maxImages} изображений`,
                severity: 'warning'
            });
            return;
        }

        // Создаем временные объекты для отображения
        const newImages = acceptedFiles.map(file => ({
            tempId: Date.now() + Math.random(),
            tempUrl: URL.createObjectURL(file),
            name: file.name,
            isNew: true,
            file: file
        }));

        const updatedLocalImages = [...localImages, ...newImages];
        const updatedNewFiles = [...newFiles, ...acceptedFiles];

        setLocalImages(updatedLocalImages);
        setNewFiles(updatedNewFiles);

        // СРАЗУ отправляем данные родителю
        notifyParent(updatedLocalImages, updatedNewFiles, deletedImageIds);

        setNotification({
            open: true,
            message: `Добавлено файлов: ${acceptedFiles.length}`,
            severity: 'success'
        });
    }, [localImages, newFiles, deletedImageIds, maxImages, notifyParent]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: useCallback((acceptedFiles) => {
            handleUpload(acceptedFiles);
        }, [handleUpload]),
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
        multiple,
        maxFiles: maxImages - localImages.length,
        disabled: uploading || localImages.length >= maxImages,
    });

    // Перемещение изображений
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over || active.id === over.id) return;

        const oldIndex = sortableIds.indexOf(active.id);
        const newIndex = sortableIds.indexOf(over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newImages = arrayMove([...localImages], oldIndex, newIndex);
            setLocalImages(newImages);

            // Уведомляем родителя о новом порядке
            notifyParent(newImages, newFiles, deletedImageIds);
        }
    }, [localImages, newFiles, deletedImageIds, sortableIds, notifyParent]);


    // Удаление изображения
    const handleDelete = useCallback((index) => {
        const imageToDelete = localImages[index];
        let updatedNewFiles = [...newFiles];
        let updatedDeletedImageIds = [...deletedImageIds];

        if (imageToDelete.isNew) {
            // Если это новое изображение, убираем его из newFiles
            updatedNewFiles = newFiles.filter(file => file !== imageToDelete.file);
        } else {
            // Если существующее - добавляем в список удаленных
            const imageId = typeof imageToDelete === 'object' ? (imageToDelete.original || imageToDelete.id) : imageToDelete;
            updatedDeletedImageIds = [...deletedImageIds, imageId];
        }

        const updatedLocalImages = localImages.filter((_, i) => i !== index);

        setLocalImages(updatedLocalImages);
        setNewFiles(updatedNewFiles);
        setDeletedImageIds(updatedDeletedImageIds);

        // Уведомляем родителя
        notifyParent(updatedLocalImages, updatedNewFiles, updatedDeletedImageIds);
    }, [localImages, newFiles, deletedImageIds, notifyParent]);


    const getDisplayUrl = useCallback((image, size = 'medium') => {
        if (!image) {
            return '/placeholder.jpg';
        }

        // Для новых изображений с объектами
        if (image.isNew) {
            if (image.tempUrl) {
                return image.tempUrl;
            }
            if (image.file instanceof File) {
                const url = URL.createObjectURL(image.file);
                image.tempUrl = url;
                return url;
            }
            return '/placeholder.jpg';
        }

        // Для строковых ID новых изображений
        if (typeof image === 'string' && image.startsWith('new_')) {
            const tempId = image.replace('new_', '');

            // Ищем в localImages
            const foundImage = localImages.find(img => img.isNew && img.tempId === tempId);

            if (foundImage) {
                if (foundImage.tempUrl) return foundImage.tempUrl;
                if (foundImage.file instanceof File) {
                    const url = URL.createObjectURL(foundImage.file);
                    foundImage.tempUrl = url;
                    return url;
                }
            }

            return '/placeholder.jpg';
        }

        // Для обычных строковых путей
        if (typeof image === 'string') {
            const url = image.startsWith('/') ? image : `/storage/${image}`;
            return url;
        }

        // Для объектов изображений из БД
        let path;
        switch(size) {
            case 'thumb': path = image.thumb_webp || image.thumb; break;
            case 'small': path = image.small_webp || image.small; break;
            case 'medium': path = image.medium_webp || image.medium; break;
            case 'large': path = image.large_webp || image.large; break;
            default: path = image.medium || image.url;
        }

        if (!path) {
            return '/placeholder.jpg';
        }

        const url = path.startsWith('/') ? path : `/storage/${path}`;
        return url;
    }, [localImages]);

    const activeImage = useMemo(() => {
        if (!activeDragId) return null;
        const index = sortableIds.indexOf(activeDragId);
        return index !== -1 ? localImages[index] : null;
    }, [activeDragId, sortableIds, localImages]);

    return (
        <Box>
            {localImages.length < maxImages && (
                <DropzoneArea
                    isDragActive={isDragActive}
                    uploading={uploading}
                    getRootProps={getRootProps}
                    getInputProps={getInputProps}
                    maxImages={maxImages}
                    currentCount={localImages.length}
                />
            )}

            {localImages.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Загружено: {localImages.length} из {maxImages}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Перетаскивайте для изменения порядка
                    </Typography>
                </Box>
            )}

            {localImages.length > 0 && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(e) => setActiveDragId(e.active.id)}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveDragId(null)}
                >
                    <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)' },
                            gap: 1.5, mb: 2,
                        }}>
                            {localImages.map((image, index) => (
                                <SortableImage
                                    key={sortableIds[index]}
                                    id={sortableIds[index]}
                                    image={image}
                                    index={index}
                                    onDelete={handleDelete}
                                    onPreview={setPreviewImage}
                                    isDragging={activeDragId === sortableIds[index]}
                                    getDisplayUrl={getDisplayUrl}
                                />
                            ))}
                        </Box>
                    </SortableContext>
                    <DragOverlay>
                        {activeImage && (
                            <Box sx={{ width: 250, opacity: 0.8 }}>
                                <CardMedia
                                    component="img"
                                    height="160"
                                    image={getDisplayUrl(activeImage, 'medium')}
                                    sx={{ objectFit: 'cover', borderRadius: 1, boxShadow: 3 }}
                                />
                            </Box>
                        )}
                    </DragOverlay>
                </DndContext>
            )}

            {localImages.length === 0 && !uploading && (
                <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'grey.50', borderRadius: 1, border: '1px dashed grey.300' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Нет загруженных изображений
                    </Typography>
                    <Button variant="outlined" size="small" startIcon={<AddIcon />}
                            onClick={() => document.querySelector('input[type="file"]')?.click()}>
                        Загрузить изображения
                    </Button>
                </Box>
            )}

            <Dialog open={!!previewImage} onClose={() => setPreviewImage(null)} maxWidth="lg" fullWidth>
                <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
                    {previewImage && (
                        <img src={previewImage} alt="Preview"
                             style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain' }}
                             onError={(e) => { e.target.src = '/placeholder.jpg'; }} />
                    )}
                </DialogContent>
            </Dialog>

            <Snackbar open={notification.open} autoHideDuration={4000}
                      onClose={() => setNotification({ ...notification, open: false })}
                      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert onClose={() => setNotification({ ...notification, open: false })}
                       severity={notification.severity} variant="filled">
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ImageUploader;

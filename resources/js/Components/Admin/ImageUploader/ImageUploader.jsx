import React, { useState, useCallback, useEffect } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import {
    Box,
    Button,
    IconButton,
    Typography,
    LinearProgress,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    Dialog,
    DialogContent,
    Alert,
    Snackbar,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    ZoomIn as ZoomIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

const ImageUploader = ({
                           images: initialImages = [],
                           pageId,
                           uploadUrl,
                           maxImages = 10,
                           multiple = true,
                           onChange
                       }) => {
    // Храним оригинальные данные изображений (относительные пути)
    const [originalImages, setOriginalImages] = useState(initialImages || []);
    const [uploading, setUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [deletedImages, setDeletedImages] = useState([]);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

    const { props } = usePage();

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

    // Обработка загрузки файлов через Inertia
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
                    'X-Requested-With': 'XMLHttpRequest', // Добавляем этот заголовок
                },
                body: formData,
            });

            // Проверяем Content-Type ответа
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();

                if (data.success && data.images) {
                    setOriginalImages(data.images);
                    setNotification({
                        open: true,
                        message: data.message || `Загружено файлов: ${acceptedFiles.length}`,
                        severity: 'success'
                    });
                } else {
                    throw new Error(data.message || 'Upload failed');
                }
            } else {
                // Если ответ не JSON, значит это редирект или ошибка
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
        disabled: uploading,
    });

    // Удаление изображения (помечаем для удаления)
    const handleDelete = (index) => {
        setDeletedImages(prev => [...prev, index]);
        const newImages = originalImages.filter((_, i) => i !== index);
        setOriginalImages(newImages);
        setNotification({
            open: true,
            message: 'Изображение будет удалено при сохранении',
            severity: 'info'
        });
    };

    // Получение URL изображения ТОЛЬКО ДЛЯ ОТОБРАЖЕНИЯ
    const getDisplayUrl = (image, size = 'medium') => {
        if (!image) return '/placeholder.jpg';

        // Если это строка (относительный путь)
        if (typeof image === 'string') {
            if (image.startsWith('http')) {
                return image;
            }
            // Формируем URL для отображения через /storage
            return image.startsWith('/') ? image : `/storage/${image}`;
        }

        // Для объекта берем нужный размер
        let path;
        switch(size) {
            case 'thumb':
                path = image.thumb || image.thumb_webp;
                break;
            case 'small':
                path = image.small || image.small_webp;
                break;
            case 'medium':
                path = image.medium || image.medium_webp;
                break;
            case 'large':
                path = image.large || image.large_webp;
                break;
            default:
                path = image.medium || image.medium_webp;
        }

        // Если не нашли размер, берем webp или original
        if (!path) {
            path = image.webp || image.original;
        }

        if (!path) return '/placeholder.jpg';

        // Формируем URL для отображения
        if (path.startsWith('http')) {
            return path;
        }
        return path.startsWith('/') ? path : `/storage/${path}`;
    };

    return (
        <Box>
            {/* Dropzone */}
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
                    </>
                )}
            </Box>

            {/* Счетчик изображений */}
            {originalImages.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Загружено: {originalImages.length} из {maxImages}
                </Typography>
            )}

            {/* Сетка изображений */}
            {originalImages.length > 0 && (
                <ImageList cols={4} rowHeight={164} gap={8}>
                    {originalImages.map((image, index) => (
                        <ImageListItem key={image.id || index}>
                            <img
                                src={getDisplayUrl(image, 'thumb')}
                                alt={`Image ${index + 1}`}
                                loading="lazy"
                                style={{
                                    height: 164,
                                    width: '100%',
                                    objectFit: 'cover',
                                }}
                                onError={(e) => {
                                    e.target.src = '/placeholder.jpg';
                                }}
                            />
                            <ImageListItemBar
                                sx={{
                                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)',
                                }}
                                position="top"
                                actionIcon={
                                    <Box>
                                        <IconButton
                                            sx={{ color: 'white' }}
                                            onClick={() => setPreviewImage(getImageUrl(image, 'large'))}
                                            size="small"
                                        >
                                            <ZoomIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            sx={{ color: 'white' }}
                                            onClick={() => handleDelete(index)}
                                            size="small"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                }
                                actionPosition="right"
                            />
                            {/* Индикатор WebP */}
                            {image.thumb?.includes('.webp') && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        bottom: 4,
                                        left: 4,
                                        bgcolor: 'success.main',
                                        color: 'white',
                                        px: 0.5,
                                        borderRadius: 0.5,
                                        fontSize: '0.65rem',
                                    }}
                                >
                                    WebP
                                </Box>
                            )}
                        </ImageListItem>
                    ))}
                </ImageList>
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
                    <Typography variant="body2" color="text.secondary">
                        Нет загруженных изображений
                    </Typography>
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

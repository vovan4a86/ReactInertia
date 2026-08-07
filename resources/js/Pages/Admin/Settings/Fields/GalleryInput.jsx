// GalleryInput.jsx - исправленная версия
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box,
    Card,
    CardMedia,
    IconButton,
    Button,
    Typography,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    Paper,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Upload as UploadIcon,
    DragIndicator as DragIndicatorIcon,
    OpenInNew as OpenIcon,
} from '@mui/icons-material';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Image Item
function SortableImage({ id, image, index, onRemove, onPreview }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
    };

    return (
        <ImageListItem ref={setNodeRef} style={style} sx={{ position: 'relative' }}>
            {/* Preview Image */}
            <CardMedia
                component="img"
                height="200"
                image={image.url}
                alt={image.name || `Image ${index + 1}`}
                sx={{
                    objectFit: 'cover',
                    cursor: 'pointer',
                    borderRadius: 1,
                }}
                onClick={() => onPreview?.(image.url)}
            />

            {/* Image Overlay Bar */}
            <ImageListItemBar
                sx={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)',
                    borderRadius: 1,
                }}
                position="top"
                actionIcon={
                    <Box sx={{ display: 'flex', gap: 0.5, pr: 1 }}>
                        {/* Drag Handle */}
                        <IconButton
                            {...attributes}
                            {...listeners}
                            sx={{
                                color: 'white',
                                cursor: 'grab',
                                '&:active': { cursor: 'grabbing' },
                            }}
                            size="small"
                        >
                            <DragIndicatorIcon fontSize="small" />
                        </IconButton>

                        {/* Open Full Size */}
                        {image.url && (
                            <IconButton
                                sx={{ color: 'white' }}
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(image.url, '_blank');
                                }}
                            >
                                <OpenIcon fontSize="small" />
                            </IconButton>
                        )}

                        {/* Delete */}
                        <IconButton
                            sx={{ color: 'white' }}
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(index);
                            }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                }
                actionPosition="right"
            />

            {/* Image Name/Index */}
            <ImageListItemBar
                title={image.name || `Изображение ${index + 1}`}
                subtitle={image.isNew ? 'Новое' : 'Существующее'}
                sx={{ borderRadius: '0 0 4px 4px' }}
            />
        </ImageListItem>
    );
}

export default function GalleryInput({
                                         name,
                                         value = [],
                                         onChange,
                                         onFileChange,
                                         fileUrls = [],
                                     }) {
    const fileInputRef = useRef(null);
    // Храним preview как Map: file.name -> dataUrl
    const [previews, setPreviews] = useState({});
    console.log(fileUrls);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Prepare images data
    const images = Array.isArray(value) ? value.map((item, index) => {
        // If item is a File object (new upload)
        if (item instanceof File) {
            // Используем имя файла как ключ для preview
            const previewUrl = previews[item.name];

            return {
                key: `new-${index}-${item.name}`,
                url: previewUrl || null,
                name: item.name,
                file: item,
                isNew: true,
            };
        }

        // If item is a string (existing file path or marker)
        if (typeof item === 'string') {
            const isStoredFile = !item.startsWith('settings.') && !item.startsWith('settings[');

            if (isStoredFile && item !== '') {
                // Получаем URL из fileUrls
                let imageUrl = null;

                // Проверяем fileUrls по разным форматам
                if (Array.isArray(fileUrls)) {
                    imageUrl = fileUrls[index] || null;
                    console.log(imageUrl)
                } else if (typeof fileUrls === 'object') {
                    imageUrl = fileUrls[index] || fileUrls[String(index)] || null;

                    // Ищем по значению файла
                    if (!imageUrl) {
                        for (const [key, url] of Object.entries(fileUrls)) {
                            if (url && url.includes(item)) {
                                imageUrl = url;
                                break;
                            }
                        }
                    }
                }

                // Если URL не найден, создаем стандартный путь
                if (!imageUrl) {
                    imageUrl = `/storage/${item}`;
                }

                return {
                    key: `existing-${index}`,
                    url: imageUrl,
                    name: item.split('/').pop(),
                    path: item,
                    isNew: false,
                };
            }
        }

        return null;
    }).filter(Boolean) : [];

    const handleAddImages = useCallback((e) => {
        const files = Array.from(e.target.files || []);

        if (files.length === 0) return;

        // Создаем preview для всех файлов
        const newPreviews = { ...previews };

        // Сначала создаем все preview
        const previewPromises = files.map((file) => {
            return new Promise((resolve) => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {

                        newPreviews[file.name] = e.target?.result;
                        resolve();
                    };
                    reader.onerror = (error) => {
                        resolve();
                    };
                    reader.readAsDataURL(file);
                } else {
                    resolve();
                }
            });
        });

        // После создания всех preview обновляем состояние
        Promise.all(previewPromises).then(() => {
            setPreviews(newPreviews);
        });

        // Добавляем файлы в value
        const currentValue = Array.isArray(value) ? value : [];
        const updatedValue = [...currentValue, ...files];

        onChange(updatedValue);

        // Уведомляем о файлах
        files.forEach((file, i) => {
            const fileKey = `${name}[${currentValue.length + i}]`;
            onFileChange(fileKey, file);
        });

        // Сбрасываем input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [value, name, onChange, onFileChange, previews]);

    const handleRemove = useCallback((index) => {
        const currentValue = Array.isArray(value) ? value : [];
        const removedItem = currentValue[index];

        const updatedValue = currentValue.filter((_, i) => i !== index);

        // Очищаем preview если удаляем новый файл
        if (removedItem instanceof File) {
            setPreviews(prev => {
                const newPreviews = { ...prev };
                delete newPreviews[removedItem.name];
                return newPreviews;
            });
        }

        // Уведомляем об удалении
        const fileKey = `${name}[${index}]`;

        onChange(updatedValue);
        onFileChange(fileKey, null);
    }, [value, name, onChange, onFileChange]);

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = images.findIndex(img => img.key === active.id);
            const newIndex = images.findIndex(img => img.key === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newValue = arrayMove(
                    Array.isArray(value) ? value : [],
                    oldIndex,
                    newIndex
                );
                onChange(newValue);
            }
        }
    }, [images, value, onChange]);

    return (
        <Box>
            {/* Gallery Grid */}
            {images.length > 0 ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={images.map(img => img.key)}
                        strategy={rectSortingStrategy}
                    >
                        <ImageList
                            cols={3}
                            gap={12}
                            rowHeight={200}
                            sx={{ mb: 2 }}
                        >
                            {images.map((image, index) => (
                                <SortableImage
                                    key={image.key}
                                    id={image.key}
                                    image={image}
                                    index={index}
                                    onRemove={handleRemove}
                                />
                            ))}
                        </ImageList>
                    </SortableContext>
                </DndContext>
            ) : (
                <Paper
                    variant="outlined"
                    sx={{
                        p: 3,
                        textAlign: 'center',
                        mb: 2,
                    }}
                >
                    <Typography color="textSecondary">
                        Нет изображений. Нажмите "Добавить" для загрузки.
                    </Typography>
                </Paper>
            )}

            {/* Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={handleAddImages}
                />

                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                        fileInputRef.current?.click();
                    }}
                >
                    Добавить изображения
                </Button>

                {images.length > 0 && (
                    <Typography variant="caption" color="textSecondary">
                        Всего: {images.length} {images.length === 1 ? 'изображение' :
                        images.length < 5 ? 'изображения' : 'изображений'}
                    </Typography>
                )}
            </Box>

            {/* Help text */}
            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                Поддерживаются форматы: JPG, PNG, GIF, WebP. Можно перетаскивать для изменения порядка.
            </Typography>
        </Box>
    );
}

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
    Box,
    IconButton,
    Button,
    Typography,
    ImageListItem,
    ImageListItemBar,
    Paper,
    CardMedia,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIndicatorIcon,
    OpenInNew as OpenIcon,
} from '@mui/icons-material';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Отдельный компонент для перетаскиваемого изображения.
 * Оборачивает ImageListItem в div с ref для корректной работы @dnd-kit.
 */
function SortableImage({ id, image, onRemove, isDragging }) {
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

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <ImageListItem sx={{ width: '100%', height: 200 }}>
                <CardMedia
                    component="img"
                    height="200"
                    image={image.url}
                    alt={image.name || 'Image'}
                    sx={{
                        objectFit: 'cover',
                        cursor: 'pointer',
                        borderRadius: 1,
                    }}
                    onClick={() => window.open(image.url, '_blank')}
                />

                <ImageListItemBar
                    sx={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)',
                        borderRadius: 1,
                    }}
                    position="top"
                    actionIcon={
                        <Box sx={{ display: 'flex', gap: 0.5, pr: 1 }}>
                            {/* Drag handle - только на иконке, чтобы не мешать кликам */}
                            <IconButton
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

                            <IconButton
                                sx={{ color: 'white' }}
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(image.id);
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    }
                    actionPosition="right"
                />

                <ImageListItemBar
                    title={image.name || 'Изображение'}
                    subtitle={image.isNew ? 'Новое' : 'Существующее'}
                    sx={{ borderRadius: '0 0 4px 4px' }}
                />
            </ImageListItem>
        </div>
    );
}

/**
 * Компонент галереи изображений с поддержкой:
 * - Множественной загрузки
 * - Drag-and-drop перетаскивания
 * - Предпросмотра новых файлов
 */
export default function GalleryInput({
                                         name,
                                         value = [],
                                         onChange,
                                         onFileChange,
                                         fileUrls = [],
                                     }) {
    const fileInputRef = useRef(null);
    const [previews, setPreviews] = useState({});
    const [activeDragId, setActiveDragId] = useState(null);
    const idCounterRef = useRef(0);

    // Локальное состояние для немедленного отклика при перетаскивании
    const [localValue, setLocalValue] = useState(() => Array.isArray(value) ? value : []);

    // Синхронизация с внешним value при изменении из родителя
    useEffect(() => {
        setLocalValue(Array.isArray(value) ? value : []);
    }, [value]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Минимальное расстояние для начала перетаскивания
            },
        })
    );

    /**
     * Формирует массив объектов изображений для рендера.
     * Ключевой момент: URL ищется по имени файла, а не по индексу,
     * что позволяет сохранять правильные URL при перетаскивании.
     */
    const images = useMemo(() => {
        const items = Array.isArray(localValue) ? localValue : [];
        const result = [];
        const usedIds = new Set();

        // Строим карту: имя_файла -> URL для быстрого поиска
        const pathToUrlMap = {};
        const fileUrlsArray = Array.isArray(fileUrls) ? fileUrls : Object.values(fileUrls || {});

        fileUrlsArray.forEach(url => {
            if (url && typeof url === 'string') {
                const fileName = url.split('/').pop();
                if (fileName) {
                    pathToUrlMap[fileName] = url;
                }
            }
        });

        items.forEach((item) => {
            let id, url, name, isNew;

            if (item instanceof File) {
                // Новый файл: ID стабилен благодаря имени и размеру
                id = `file-${item.name}-${item.size}`;
                url = previews[item.name] || null;
                name = item.name;
                isNew = true;
            } else if (typeof item === 'string' && !item.startsWith('settings.')) {
                // Существующий файл: ID стабилен благодаря пути
                id = `existing-${item}`;
                const fileName = item.split('/').pop();

                // Ищем URL по имени файла в карте
                url = pathToUrlMap[fileName] || pathToUrlMap[item];

                // Если не нашли, пробуем найти по частичному совпадению
                if (!url) {
                    url = fileUrlsArray.find(u => u && u.includes(fileName)) || null;
                }

                // Fallback на стандартный путь
                if (!url) {
                    url = `/storage/${item}`;
                }

                name = fileName || item;
                isNew = false;
            } else {
                return; // Пропускаем маркеры и пустые строки
            }

            // Гарантируем уникальность ID
            let uniqueId = id;
            while (usedIds.has(uniqueId)) {
                uniqueId = `${id}-${idCounterRef.current++}`;
            }
            usedIds.add(uniqueId);

            result.push({ id: uniqueId, url, name, isNew });
        });

        return result;
    }, [localValue, fileUrls, previews]);

    /**
     * Добавление новых изображений.
     * Создает preview через FileReader и добавляет файлы в массив.
     */
    const handleAddImages = useCallback((e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Создаем preview для всех файлов параллельно
        const newPreviews = { ...previews };
        const previewPromises = files.map((file) => {
            return new Promise((resolve) => {
                if (!file.type.startsWith('image/')) {
                    resolve();
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    newPreviews[file.name] = e.target?.result;
                    resolve();
                };
                reader.onerror = () => resolve();
                reader.readAsDataURL(file);
            });
        });

        Promise.all(previewPromises).then(() => setPreviews(newPreviews));

        const currentValue = Array.isArray(localValue) ? localValue : [];
        const updatedValue = [...currentValue, ...files];

        setLocalValue(updatedValue); // Обновляем локально
        onChange(updatedValue); // И уведомляем родителя

        // Уведомляем родителя о новых файлах для FormData
        files.forEach((file, i) => {
            onFileChange(`${name}[${currentValue.length + i}]`, file);
        });

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [localValue, name, onChange, onFileChange, previews]);

    /**
     * Удаление изображения по его ID.
     */
    const handleRemove = useCallback((imageId) => {
        const currentValue = Array.isArray(localValue) ? localValue : [];
        const imageIndex = images.findIndex(img => img.id === imageId);
        if (imageIndex === -1) return;

        const removedItem = currentValue[imageIndex];
        const updatedValue = currentValue.filter((_, i) => i !== imageIndex);

        if (removedItem instanceof File) {
            setPreviews(prev => {
                const newPreviews = { ...prev };
                delete newPreviews[removedItem.name];
                return newPreviews;
            });
        }

        setLocalValue(updatedValue); // Обновляем локально
        const fileKey = `${name}[${imageIndex}]`;
        onChange(updatedValue); // И уведомляем родителя
        onFileChange(fileKey, null);
    }, [localValue, name, onChange, onFileChange, images]);

    /**
     * Обработчик завершения перетаскивания.
     * Использует arrayMove для перестановки элементов.
     */
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over || active.id === over.id) return;

        const currentValue = Array.isArray(localValue) ? [...localValue] : [];

        const oldIndex = images.findIndex(img => img.id === active.id);
        const newIndex = images.findIndex(img => img.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const currentValue = Array.isArray(localValue) ? [...localValue] : [];
            const newValue = arrayMove(currentValue, oldIndex, newIndex);

            setLocalValue(newValue); // Сначала локально для мгновенного отклика
            onChange(newValue);      // Затем уведомляем родителя
        }
    }, [localValue, images, onChange]);

    const handleDragCancel = useCallback(() => {
        setActiveDragId(null);
    }, []);

    const sortableIds = images.map(img => img.id);

    const activeImage = activeDragId
        ? images.find(img => img.id === activeDragId)
        : null;

    return (
        <Box>
            {images.length > 0 ? (
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
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 1.5,
                                mb: 2,
                            }}
                        >
                            {images.map((image) => (
                                <SortableImage
                                    key={image.id}
                                    id={image.id}
                                    image={image}
                                    onRemove={handleRemove}
                                    isDragging={activeDragId === image.id}
                                />
                            ))}
                        </Box>
                    </SortableContext>

                    {/* Оверлей для перетаскиваемого изображения */}
                    <DragOverlay>
                        {activeImage ? (
                            <Box sx={{ width: '100%', maxWidth: 300, opacity: 0.8 }}>
                                <CardMedia
                                    component="img"
                                    height="200"
                                    image={activeImage.url}
                                    alt={activeImage.name}
                                    sx={{ objectFit: 'cover', borderRadius: 1 }}
                                />
                            </Box>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            ) : (
                <Paper
                    variant="outlined"
                    sx={{ p: 3, textAlign: 'center', mb: 2 }}
                >
                    <Typography color="textSecondary">
                        Нет изображений. Нажмите "Добавить" для загрузки.
                    </Typography>
                </Paper>
            )}

            {/* Кнопка добавления */}
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
                    onClick={() => fileInputRef.current?.click()}
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

            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                Поддерживаются форматы: JPG, PNG, GIF, WebP. Можно перетаскивать для изменения порядка.
            </Typography>
        </Box>
    );
}

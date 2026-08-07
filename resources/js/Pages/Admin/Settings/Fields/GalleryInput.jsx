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
    Tooltip,
    Chip,
    Stack,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIndicatorIcon,
    OpenInNew as OpenIcon,
    PhotoLibrary as GalleryIcon,
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
 * Компонент для отображения миниатюр изображения
 */
function ThumbnailsPreview({ image, thumbs }) {
    const [showThumbs, setShowThumbs] = useState(false);

    if (!thumbs || Object.keys(thumbs).length === 0) {
        return null;
    }

    const thumbEntries = Object.entries(thumbs);

    return (
        <Box sx={{ mt: 0.5 }}>
            <Button
                size="small"
                variant="text"
                onClick={() => setShowThumbs(!showThumbs)}
                sx={{ fontSize: '0.7rem', minWidth: 'auto', px: 1 }}
            >
                {showThumbs ? 'Скрыть' : `Все размеры (${thumbEntries.length})`}
            </Button>

            {showThumbs && (
                <Box sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.5,
                    mt: 0.5,
                    p: 0.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                }}>
                    {thumbEntries.map(([key, thumb]) => (
                        <Tooltip
                            key={key}
                            title={`${thumb.config}${thumb.size ? ` (${thumb.size.mode})` : ''}`}
                            arrow
                        >
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: 60,
                                    height: 50,
                                    borderRadius: 0.5,
                                    overflow: 'hidden',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                        borderColor: 'primary.main',
                                    },
                                }}
                                onClick={() => window.open(thumb.url, '_blank')}
                            >
                                <CardMedia
                                    component="img"
                                    image={thumb.url}
                                    alt={`Thumb ${key}`}
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                            </Box>
                        </Tooltip>
                    ))}
                </Box>
            )}
        </Box>
    );
}

/**
 * Отдельный компонент для перетаскиваемого изображения.
 * Оборачивает ImageListItem в div с ref для корректной работы @dnd-kit.
 */
function SortableImage({ id, image, onRemove, isDragging, thumbsConfig }) {
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

    // Проверяем, есть ли thumbs для этого изображения
    const hasThumbs = image.thumbs && Object.keys(image.thumbs).length > 0;

    // Берем первый thumb (индекс 0) для отображения
    const displayThumb = hasThumbs ? image.thumbs[0] : null;

    // URL для отображения: первый thumb или оригинал
    const displayUrl = displayThumb?.url || image.url;
    const originalUrl = image.url;

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Paper
                elevation={0}
                sx={{
                    border: '1px solid',
                    borderColor: hasThumbs ? 'primary.light' : 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                    '&:hover': {
                        borderColor: 'primary.main',
                    },
                }}
            >
                <Box sx={{ position: 'relative', height: 200 }}>
                    <CardMedia
                        component="img"
                        height="200"
                        image={displayUrl}
                        alt={image.name || 'Image'}
                        sx={{
                            objectFit: 'cover',
                            cursor: 'pointer',
                        }}
                        onClick={() => window.open(originalUrl, '_blank')}
                    />

                    {/* Индикатор, что показан thumb */}
                    {displayThumb && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                bgcolor: 'rgba(25, 118, 210, 0.85)',
                                color: 'white',
                                fontSize: '0.65rem',
                                px: 0.8,
                                py: 0.3,
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.3,
                            }}
                        >
                            <GalleryIcon sx={{ fontSize: '0.8rem' }} />
                            {displayThumb.config || 'thumb'}
                        </Box>
                    )}

                    <ImageListItemBar
                        sx={{
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)',
                        }}
                        position="top"
                        actionIcon={
                            <Box sx={{ display: 'flex', gap: 0.5, pr: 1 }}>
                                {/* Drag handle */}
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

                                {/* Кнопка просмотра оригинала */}
                                {originalUrl && (
                                    <Tooltip title="Открыть оригинал">
                                        <IconButton
                                            sx={{ color: 'white' }}
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(originalUrl, '_blank');
                                            }}
                                        >
                                            <OpenIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
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
                </Box>

                {/* Информация об изображении */}
                <Box sx={{ p: 1 }}>
                    <Stack spacing={0.5}>
                        <Typography variant="caption" fontWeight="medium" noWrap>
                            {image.name || 'Изображение'}
                        </Typography>

                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            <Chip
                                label={image.isNew ? 'Новое' : 'Существующее'}
                                size="small"
                                color={image.isNew ? 'success' : 'default'}
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.65rem' }}
                            />
                            {hasThumbs && (
                                <Chip
                                    icon={<GalleryIcon sx={{ fontSize: '0.7rem !important' }} />}
                                    label={`${Object.keys(image.thumbs).length} разм.`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                />
                            )}
                        </Stack>
                    </Stack>

                    {/* Отображение всех миниатюр */}
                    <ThumbnailsPreview
                        image={image}
                        thumbs={image.thumbs}
                    />
                </Box>
            </Paper>
        </div>
    );
}


/**
 * Компонент галереи изображений с поддержкой:
 * - Множественной загрузки
 * - Drag-and-drop перетаскивания
 * - Предпросмотра новых файлов
 * - Отображения миниатюр (thumbs)
 */
export default function GalleryInput({
                                         name,
                                         value = [],
                                         onChange,
                                         onFileChange,
                                         fileUrls = [],
                                         thumbsData = {}, // Новый пропс для данных о миниатюрах
                                         thumbsConfig = [], // Новый пропс для конфигурации миниатюр
                                     }) {
    const fileInputRef = useRef(null);
    const [previews, setPreviews] = useState({});
    const [activeDragId, setActiveDragId] = useState(null);

    // Локальное состояние для немедленного отклика при перетаскивании
    const [localValue, setLocalValue] = useState(() => Array.isArray(value) ? value : []);

    // Синхронизация с внешним value при изменении из родителя
    useEffect(() => {
        setLocalValue(Array.isArray(value) ? value : []);
    }, [value]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    /**
     * Формирует массив объектов изображений для рендера.
     * Включает информацию о миниатюрах.
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

        items.forEach((item, index) => {
            let id, url, name, isNew, thumbs;

            if (item instanceof File) {
                // Новый файл
                id = `file-${item.name}-${item.size}`;
                url = previews[item.name] || null;
                name = item.name;
                isNew = true;
                thumbs = null; // У новых файлов еще нет миниатюр
            } else if (typeof item === 'string' && !item.startsWith('settings.')) {
                // Существующий файл
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

                // Получаем миниатюры из переданных данных
                thumbs = thumbsData[item] || thumbsData[fileName] || null;

                // Если thumbs не переданы, но есть конфигурация, формируем URL'ы
                if (!thumbs && thumbsConfig.length > 0 && url) {
                    thumbs = {};
                    const baseName = name.replace(/\.[^/.]+$/, '');
                    const extension = name.split('.').pop();

                    thumbsConfig.forEach((config, key) => {
                        const size = config.split('|')[0];
                        const thumbFileName = `${baseName}_thumb_${key}.${extension}`;
                        const thumbPath = url.replace(name, `thumbs/${thumbFileName}`);
                        thumbs[key] = {
                            url: thumbPath,
                            config: config,
                        };
                    });
                }
            } else {
                return; // Пропускаем маркеры и пустые строки
            }

            // Гарантируем уникальность ID
            let uniqueId = id;
            while (usedIds.has(uniqueId)) {
                uniqueId = `${id}-${Math.random()}`;
            }
            usedIds.add(uniqueId);

            result.push({
                id: uniqueId,
                url,
                name,
                isNew,
                thumbs, // Добавляем информацию о миниатюрах
            });
        });

        return result;
    }, [localValue, fileUrls, previews, thumbsData, thumbsConfig]);

    /**
     * Добавление новых изображений.
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

        setLocalValue(updatedValue);
        onChange(updatedValue);

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

        setLocalValue(updatedValue);
        const fileKey = `${name}[${imageIndex}]`;
        onChange(updatedValue);
        onFileChange(fileKey, null);
    }, [localValue, name, onChange, onFileChange, images]);

    /**
     * Обработчик завершения перетаскивания.
     */
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over || active.id === over.id) return;

        const oldIndex = images.findIndex(img => img.id === active.id);
        const newIndex = images.findIndex(img => img.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const currentValue = Array.isArray(localValue) ? [...localValue] : [];
            const newValue = arrayMove(currentValue, oldIndex, newIndex);

            setLocalValue(newValue);
            onChange(newValue);
        }
    }, [localValue, images, onChange]);

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
                                    thumbsConfig={thumbsConfig}
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
                    <GalleryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="textSecondary">
                        Нет изображений. Нажмите "Добавить" для загрузки.
                    </Typography>
                    {thumbsConfig.length > 0 && (
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                            После загрузки будут автоматически созданы миниатюры: {thumbsConfig.join(', ')}
                        </Typography>
                    )}
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
                Поддерживаются форматы: JPG, PNG, GIF, WebP, AVIF. Можно перетаскивать для изменения порядка.
            </Typography>
        </Box>
    );
}

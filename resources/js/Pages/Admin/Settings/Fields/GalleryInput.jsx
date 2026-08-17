import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
    Box,
    Button,
    CardMedia,
    Chip,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIndicatorIcon,
    OpenInNew as OpenIcon,
    PhotoLibrary as GalleryIcon,
} from '@mui/icons-material';
import {
    closestCenter,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    rectSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSettingsForm } from '../SettingsFormContext';
import { isUploadMarker } from '../utils/uploads';

/**
 * Плитка галереи с ручкой перетаскивания и панелью миниатюр.
 */
const SortableImage = memo(function SortableImage({ image, onRemove }) {
    const [showThumbs, setShowThumbs] = useState(false);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: image.id,
    });

    const thumbEntries = Object.entries(image.thumbs ?? {});

    return (
        <Paper
            ref={setNodeRef}
            variant="outlined"
            {...attributes}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.35 : 1,
            }}
            sx={{
                position: 'relative',
                overflow: 'hidden',
                borderColor: image.isNew ? 'warning.light' : 'divider',
                '&:hover': { borderColor: 'primary.main' },
            }}
        >
            <Box sx={{ position: 'relative', height: 160, bgcolor: 'grey.100' }}>
                {image.url ? (
                    <CardMedia
                        component="img"
                        image={image.url}
                        alt={image.name}
                        loading="lazy"
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                        onClick={() => window.open(image.url, '_blank', 'noopener')}
                    />
                ) : (
                    <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                        <GalleryIcon color="disabled" />
                    </Stack>
                )}

                {/* Панель действий */}
                <Stack
                    direction="row"
                    spacing={0.25}
                    justifyContent="flex-end"
                    sx={{
                        position: 'absolute',
                        inset: '0 0 auto 0',
                        p: 0.5,
                        background: 'linear-gradient(to bottom, rgba(0,0,0,.55), transparent)',
                    }}
                >
                    <Tooltip title="Перетащить">
                        <IconButton
                            size="small"
                            {...listeners}
                            sx={{ color: 'common.white', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
                        >
                            <DragIndicatorIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {image.url && !image.isNew && (
                        <Tooltip title="Открыть оригинал">
                            <IconButton
                                size="small"
                                sx={{ color: 'common.white' }}
                                onClick={() => window.open(image.url, '_blank', 'noopener')}
                            >
                                <OpenIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}

                    <Tooltip title="Удалить">
                        <IconButton
                            size="small"
                            sx={{ color: 'common.white' }}
                            onClick={() => onRemove(image.id)}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>

                {image.isNew && (
                    <Chip
                        label="новое"
                        size="small"
                        color="warning"
                        sx={{ position: 'absolute', bottom: 4, left: 4, height: 20, fontSize: '.65rem' }}
                    />
                )}

                {thumbEntries.length > 0 && (
                    <Tooltip title="Миниатюры">
                        <IconButton
                            size="small"
                            onClick={() => setShowThumbs((prev) => !prev)}
                            sx={{
                                position: 'absolute',
                                bottom: 4,
                                right: 4,
                                width: 24,
                                height: 24,
                                color: 'common.white',
                                bgcolor: 'rgba(0,0,0,.45)',
                                '&:hover': { bgcolor: 'rgba(0,0,0,.65)' },
                            }}
                        >
                            <GalleryIcon sx={{ fontSize: '.85rem' }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {showThumbs && thumbEntries.length > 0 && (
                <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ p: 0.5, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider', overflowX: 'auto' }}
                >
                    {thumbEntries.map(([key, thumb]) => (
                        <Tooltip key={key} title={thumb.config ?? ''} arrow>
                            <Box
                                onClick={() => window.open(thumb.url, '_blank', 'noopener')}
                                sx={{
                                    position: 'relative',
                                    minWidth: 60,
                                    height: 46,
                                    flexShrink: 0,
                                    borderRadius: 0.5,
                                    overflow: 'hidden',
                                    border: 1,
                                    borderColor: 'divider',
                                    cursor: 'pointer',
                                }}
                            >
                                <CardMedia
                                    component="img"
                                    image={thumb.url}
                                    alt={`thumb-${key}`}
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </Box>
                        </Tooltip>
                    ))}
                </Stack>
            )}
        </Paper>
    );
});

/**
 * Галерея изображений (тип 7).
 *
 * Значение — упорядоченный массив строк: имя сохранённого файла либо
 * маркер `@upload:<token>`. Идентификатор dnd-элемента = сама строка,
 * поэтому ID стабильны, а порядок отправляется на сервер как есть.
 *
 * @param {object} props
 * @param {object} props.setting
 * @param {string[]} props.value
 * @param {(value: string[]) => void} props.onChange
 */
function GalleryInput({ setting, value = [], onChange }) {
    const inputRef = useRef(null);
    const [activeId, setActiveId] = useState(null);
    const { registerUpload, releaseUpload, resolveFileUrl, resolveFileName, resolveThumbs } = useSettingsForm();

    const items = Array.isArray(value) ? value : [];

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    /** Модель для рендера: URL берётся либо из превью, либо из карты file_urls. */
    const images = useMemo(
        () =>
            items.map((entry) => ({
                id: entry,
                url: resolveFileUrl(setting, entry),
                name: resolveFileName(entry),
                isNew: isUploadMarker(entry),
                thumbs: isUploadMarker(entry) ? null : resolveThumbs(setting, entry),
            })),
        [items, setting, resolveFileUrl, resolveFileName, resolveThumbs],
    );

    const handleAdd = useCallback(
        (event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length === 0) return;

            onChange([...items, ...files.map((file) => registerUpload(file))]);
            event.target.value = '';
        },
        [items, onChange, registerUpload],
    );

    const handleRemove = useCallback(
        (id) => {
            if (isUploadMarker(id)) releaseUpload(id);
            onChange(items.filter((entry) => entry !== id));
        },
        [items, onChange, releaseUpload],
    );

    const handleDragEnd = useCallback(
        ({ active, over }) => {
            setActiveId(null);
            if (!over || active.id === over.id) return;

            const from = items.indexOf(active.id);
            const to = items.indexOf(over.id);

            if (from !== -1 && to !== -1) onChange(arrayMove(items, from, to));
        },
        [items, onChange],
    );

    const activeImage = activeId ? images.find((image) => image.id === activeId) : null;
    const thumbsConfig = setting?.thumbs_config ?? {};
    const thumbsHint = Object.values(thumbsConfig).join(', ');

    return (
        <Box>
            {images.length > 0 ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={({ active }) => setActiveId(active.id)}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveId(null)}
                >
                    <SortableContext items={items} strategy={rectSortingStrategy}>
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
                            {images.map((image) => (
                                <SortableImage key={image.id} image={image} onRemove={handleRemove} />
                            ))}
                        </Box>
                    </SortableContext>

                    <DragOverlay dropAnimation={{ duration: 180 }}>
                        {activeImage?.url && (
                            <CardMedia
                                component="img"
                                image={activeImage.url}
                                alt={activeImage.name}
                                sx={{ width: 200, height: 160, objectFit: 'cover', borderRadius: 1, opacity: 0.9 }}
                            />
                        )}
                    </DragOverlay>
                </DndContext>
            ) : (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', mb: 2 }}>
                    <GalleryIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">Изображений пока нет</Typography>
                    {thumbsHint && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Будут созданы миниатюры: {thumbsHint}
                        </Typography>
                    )}
                </Paper>
            )}

            <Stack direction="row" spacing={2} alignItems="center">
                <input ref={inputRef} type="file" hidden multiple accept="image/*" onChange={handleAdd} />
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => inputRef.current?.click()}
                >
                    Добавить изображения
                </Button>

                {images.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                        Всего: {images.length}
                        {images.some((image) => image.isNew) && ' · есть незагруженные'}
                    </Typography>
                )}
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                JPG, PNG, GIF, WebP, AVIF. Порядок меняется перетаскиванием и сохраняется как есть.
            </Typography>
        </Box>
    );
}

export default memo(GalleryInput);

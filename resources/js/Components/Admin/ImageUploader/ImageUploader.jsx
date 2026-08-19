import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Alert,
    Box,
    Button,
    CardMedia,
    Dialog,
    DialogContent,
    IconButton,
    LinearProgress,
    Paper,
    Snackbar,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import UploadIcon from '@mui/icons-material/Upload';
import ZoomIcon from '@mui/icons-material/ZoomOutMap';

const SortableImage = ({ id, image, index, isDragging, onDelete, onPreview, getDisplayUrl }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const thumbUrl = getDisplayUrl(image, 'thumb');
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
                    '&:hover': { borderColor: 'primary.main' },
                }}
            >
                <Box sx={{ position: 'relative', height: 164 }}>
                    <CardMedia
                        component="img"
                        height="164"
                        image={thumbUrl}
                        alt={`Изображение ${index + 1}`}
                        sx={{ objectFit: 'cover', cursor: 'pointer', width: '100%', height: '100%' }}
                        onClick={() => onPreview(largeUrl)}
                        onError={(e) => { e.target.src = '/placeholder.jpg'; }}
                    />

                    {/* Оверлей с кнопками */}
                    <Box
                        sx={{
                            position: 'absolute', top: 0, left: 0, right: 0,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                            p: 0.5,
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
                            zIndex: 2,
                        }}
                    >
                        {/* WebP-бейдж */}
                        {image?.thumb_webp && (
                            <Box sx={{
                                bgcolor: 'success.main', color: 'white',
                                px: 0.5, py: 0.2, borderRadius: 0.5, fontSize: '0.65rem',
                            }}>
                                WebP
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                            <Tooltip title="Переместить">
                                <IconButton {...listeners} size="small" sx={{ color: 'white', cursor: 'grab', p: 0.5 }}>
                                    <DragIndicatorIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Предпросмотр">
                                <IconButton
                                    size="small"
                                    sx={{ color: 'white', p: 0.5 }}
                                    onClick={(e) => { e.stopPropagation(); onPreview(largeUrl); }}
                                >
                                    <ZoomIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                                <IconButton
                                    size="small"
                                    sx={{ color: 'white', p: 0.5 }}
                                    onClick={(e) => { e.stopPropagation(); onDelete(index); }}
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

const DropzoneArea = ({ isDragActive, uploading, getRootProps, getInputProps, maxImages }) => (
    <Box
        {...getRootProps()}
        sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            borderRadius: 1, p: 3, mb: 2, textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.7 : 1,
            bgcolor: isDragActive ? 'action.hover' : 'transparent',
            transition: 'all 0.2s',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }}
    >
        <input {...getInputProps()} />
        {uploading ? (
            <Box>
                <LinearProgress sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Загрузка…</Typography>
            </Box>
        ) : (
            <>
                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                    {isDragActive ? 'Отпустите файлы для загрузки' : 'Перетащите изображения или кликните для выбора'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    JPEG, PNG, GIF, WebP • Макс. 10 MB • До {maxImages} изображений
                </Typography>
            </>
        )}
    </Box>
);

/**
 * Компонент галереи изображений с drag-and-drop сортировкой.
 *
 * Props:
 *  - images        {Array}    — массив объектов изображений с бэкенда (или пустой)
 *  - pageId        {number}   — id страницы (для ключа)
 *  - maxImages     {number}   — максимум изображений (по умолчанию 10)
 *  - multiple      {boolean}  — разрешить мультизагрузку
 *  - onChange      {Function} — (order, newFiles, deletedIds) => void
 *
 * Вызов onChange передаёт родителю (PageForm):
 *  - order:      массив строк — id существующих или `new_<tempId>` для новых
 *  - newFiles:   массив File-объектов для new_images[]
 *  - deletedIds: массив id удалённых существующих изображений
 */
const ImageUploader = ({
                           images: externalImages = [],
                           pageId,
                           maxImages = 10,
                           multiple   = true,
                           onChange,
                       }) => {
    const [localImages,     setLocalImages]     = useState([]);
    const [newFiles,        setNewFiles]        = useState([]);
    const [deletedIds,      setDeletedIds]      = useState([]);
    const [previewUrl,      setPreviewUrl]      = useState(null);
    const [activeDragId,    setActiveDragId]    = useState(null);
    const [notification,    setNotification]    = useState({ open: false, message: '', severity: 'success' });
    const [initialized,     setInitialized]     = useState(false);

    /* Стабильная ссылка на onChange */
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    /* ─── Инициализация/сброс при смене страницы (pageId) ──────────────
     * Ключевое исправление: раньше был флаг `initialized` — он не сбрасывался
     * при навигации между страницами, и галерея показывала данные предыдущей.
     * Теперь сбрасываемся по `pageId` через отдельный `useEffect`.
     * ─────────────────────────────────────────────────────────────────── */
    useEffect(() => {
        // Освобождаем blob-URL старых новых файлов
        localImages.forEach((img) => {
            if (img?.isNew && img.tempUrl) URL.revokeObjectURL(img.tempUrl);
        });

        setLocalImages(Array.isArray(externalImages) ? [...externalImages] : []);
        setNewFiles([]);
        setDeletedIds([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageId]); // <- сбрасываемся только при смене страницы, не при каждом render

    /* Cleanup blob-URL при размонтировании */
    useEffect(() => {
        return () => {
            localImages.forEach((img) => {
                if (img?.isNew && img.tempUrl) URL.revokeObjectURL(img.tempUrl);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── helpers ── */

    /**
     * Вычисляем стабильный id для сортировщика:
     *  - новые файлы: `new-<tempId>`
     *  - существующие объекты: `img-<index>` (index стабилен в рамках одного рендера)
     */
    const sortableIds = useMemo(() =>
            localImages.map((img, i) => img?.isNew ? `new-${img.tempId}` : `img-${i}`),
        [localImages]);

    /** Уведомляем родителя об изменениях. */
    const notify = useCallback((images, files, deleted) => {
        if (!onChangeRef.current) return;

        const order = images.map((img) => {
            if (img?.isNew) return `new_${img.tempId}`;
            if (typeof img === 'object') return img.original ?? img.id ?? img.name;
            return img;
        });

        onChangeRef.current(order, files, deleted);
    }, []);

    /** Получить URL для отображения изображения. */
    const getDisplayUrl = useCallback((image, size = 'medium') => {
        if (!image) return '/placeholder.jpg';

        /* Новый файл (ещё не сохранён) */
        if (image?.isNew) {
            if (image.tempUrl) return image.tempUrl;
            if (image.file instanceof File) {
                const url = URL.createObjectURL(image.file);
                image.tempUrl = url; // кешируем на объекте
                return url;
            }
            return '/placeholder.jpg';
        }

        /* Объект с бэкенда */
        if (typeof image === 'object') {
            const sizeMap = {
                thumb:  image.thumb_webp  || image.thumb,
                small:  image.small_webp  || image.small,
                medium: image.medium_webp || image.medium,
                large:  image.large_webp  || image.large,
            };
            const path = sizeMap[size] || image.medium || image.url;
            if (!path) return '/placeholder.jpg';
            return path.startsWith('/') ? path : `/storage/${path}`;
        }

        /* Строка */
        return (image).startsWith('/') ? image : `/storage/${image}`;
    }, []);

    /* ── DnD ── */
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );

    const handleDragEnd = useCallback(({ active, over }) => {
        setActiveDragId(null);
        if (!over || active.id === over.id) return;

        const oldIdx = sortableIds.indexOf(active.id);
        const newIdx = sortableIds.indexOf(over.id);
        if (oldIdx === -1 || newIdx === -1) return;

        const reordered = arrayMove([...localImages], oldIdx, newIdx);
        setLocalImages(reordered);
        notify(reordered, newFiles, deletedIds);
    }, [localImages, newFiles, deletedIds, sortableIds, notify]);

    /* ── Dropzone ── */
    const handleDrop = useCallback((accepted) => {
        if (localImages.length + accepted.length > maxImages) {
            setNotification({ open: true, severity: 'warning', message: `Максимум ${maxImages} изображений` });
            return;
        }

        const newImgs = accepted.map((file) => ({
            tempId:  `${Date.now()}-${Math.random()}`,
            tempUrl: URL.createObjectURL(file),
            name:    file.name,
            isNew:   true,
            file,
        }));

        const updatedImages = [...localImages, ...newImgs];
        const updatedFiles  = [...newFiles, ...accepted];

        setLocalImages(updatedImages);
        setNewFiles(updatedFiles);
        notify(updatedImages, updatedFiles, deletedIds);

        setNotification({ open: true, severity: 'success', message: `Добавлено: ${accepted.length}` });
    }, [localImages, newFiles, deletedIds, maxImages, notify]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop:   handleDrop,
        accept:   { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
        multiple,
        maxFiles: maxImages - localImages.length,
        disabled: localImages.length >= maxImages,
    });

    /* ── Удаление ── */
    const handleDelete = useCallback((index) => {
        const img = localImages[index];
        let updatedFiles   = [...newFiles];
        let updatedDeleted = [...deletedIds];

        if (img?.isNew) {
            // Убираем из newFiles — ищем по ссылке на файл
            updatedFiles = newFiles.filter((f) => f !== img.file);
            if (img.tempUrl) URL.revokeObjectURL(img.tempUrl);
        } else {
            // Добавляем в удалённые — ключ = img.name (то что ждёт бэк в deleted_images[])
            const nameKey = typeof img === 'object' ? (img.name ?? img.original ?? img.id) : String(img);
            if (nameKey) {
                updatedDeleted = [...deletedIds, nameKey];
            }
        }

        const updatedImages = localImages.filter((_, i) => i !== index);
        setLocalImages(updatedImages);
        setNewFiles(updatedFiles);
        setDeletedIds(updatedDeleted);
        notify(updatedImages, updatedFiles, updatedDeleted);
    }, [localImages, newFiles, deletedIds, notify]);

    /* ── drag overlay image ── */
    const activeImage = useMemo(() => {
        if (!activeDragId) return null;
        const idx = sortableIds.indexOf(activeDragId);
        return idx !== -1 ? localImages[idx] : null;
    }, [activeDragId, sortableIds, localImages]);

    /* ══════════════════════════ render ══════════════════════════ */
    return (
        <Box>
            {/* Dropzone (скрывается когда достигнут лимит) */}
            {localImages.length < maxImages && (
                <DropzoneArea
                    isDragActive={isDragActive}
                    uploading={false}
                    getRootProps={getRootProps}
                    getInputProps={getInputProps}
                    maxImages={maxImages}
                />
            )}

            {/* Счётчик */}
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

            {/* Сетка с сортировкой */}
            {localImages.length > 0 && (
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
                                gap: 1.5, mb: 2,
                            }}
                        >
                            {localImages.map((image, index) => (
                                <SortableImage
                                    key={sortableIds[index]}
                                    id={sortableIds[index]}
                                    image={image}
                                    index={index}
                                    isDragging={activeDragId === sortableIds[index]}
                                    onDelete={handleDelete}
                                    onPreview={setPreviewUrl}
                                    getDisplayUrl={getDisplayUrl}
                                />
                            ))}
                        </Box>
                    </SortableContext>

                    <DragOverlay>
                        {activeImage && (
                            <Box sx={{ width: 250, opacity: 0.85 }}>
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

            {/* Пустое состояние (если изображений нет и дропзона скрыта) */}
            {localImages.length === 0 && localImages.length >= maxImages && (
                <Box
                    sx={{
                        textAlign: 'center', py: 4,
                        bgcolor: 'grey.50', borderRadius: 1,
                        border: '1px dashed', borderColor: 'divider',
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
            <Dialog open={!!previewUrl} onClose={() => setPreviewUrl(null)} maxWidth="lg" fullWidth>
                <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
                    {previewUrl && (
                        <img
                            src={previewUrl}
                            alt="Предпросмотр"
                            style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain', display: 'block' }}
                            onError={(e) => { e.target.src = '/placeholder.jpg'; }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Уведомления */}
            <Snackbar
                open={notification.open}
                autoHideDuration={3500}
                onClose={() => setNotification((n) => ({ ...n, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert
                    severity={notification.severity}
                    variant="filled"
                    onClose={() => setNotification((n) => ({ ...n, open: false }))}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ImageUploader;

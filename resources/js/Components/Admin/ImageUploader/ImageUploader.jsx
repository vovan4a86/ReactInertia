import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Alert, Box, CardMedia, Dialog, DialogContent, IconButton,
    Paper, Snackbar, Tooltip, Typography,
} from '@mui/material';
import {
    DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, arrayMove, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import UploadIcon from '@mui/icons-material/Upload';
import ZoomIcon from '@mui/icons-material/ZoomOutMap';

const PLACEHOLDER = '/placeholder.jpg';
const NEW_PREFIX  = 'new:';

const uid = () =>
    (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-z0-9]/gi, '');

/** Запись с бэкенда → внутренний item. Идентификатор — только `name`. */
const fromServer = (img) => ({
    key:   `ex:${img.name}`,
    token: img.name,
    isNew: false,
    webp:  Boolean(img.thumb_webp),
    thumb: img.thumb_webp || img.thumb || img.src || PLACEHOLDER,
    large: img.large_webp || img.large || img.src || PLACEHOLDER,
});

/** File → внутренний item с blob-превью. */
const fromFile = (file) => {
    const id  = uid();
    const url = URL.createObjectURL(file);

    return {
        key:   `${NEW_PREFIX}${id}`,
        token: `${NEW_PREFIX}${id}`,
        tempId: id,
        isNew: true,
        webp:  false,
        thumb: url,
        large: url,
        file,
    };
};

/* ─────────────────────────── Sortable tile ─────────────────────────── */

function SortableImage({ item, index, dragging, onDelete, onPreview }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.key });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: dragging ? 0.3 : 1,
            }}
            {...attributes}
        >
            <Paper
                elevation={0}
                sx={{
                    border: '1px solid',
                    borderColor: dragging ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    '&:hover': { borderColor: 'primary.main' },
                }}
            >
                <Box sx={{ position: 'relative', height: 164 }}>
                    <CardMedia
                        component="img"
                        image={item.thumb}
                        alt={`Изображение ${index + 1}`}
                        sx={{ objectFit: 'cover', cursor: 'zoom-in', width: '100%', height: 164 }}
                        onClick={() => onPreview(item.large)}
                        onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
                    />

                    <Box
                        sx={{
                            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', p: 0.5,
                            background: 'linear-gradient(to bottom, rgba(0,0,0,.55) 0%, transparent 100%)',
                        }}
                    >
                        {item.isNew ? (
                            <Box sx={{ bgcolor: 'warning.main', color: 'white', px: 0.5, borderRadius: 0.5, fontSize: '.65rem' }}>
                                Новое
                            </Box>
                        ) : item.webp && (
                            <Box sx={{ bgcolor: 'success.main', color: 'white', px: 0.5, borderRadius: 0.5, fontSize: '.65rem' }}>
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
                                    size="small" sx={{ color: 'white', p: 0.5 }}
                                    onClick={(e) => { e.stopPropagation(); onPreview(item.large); }}
                                >
                                    <ZoomIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                                <IconButton
                                    size="small" sx={{ color: 'white', p: 0.5 }}
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
}

/* ───────────────────────────── Uploader ───────────────────────────── */

/**
 * @param {Array}    images    записи галереи из PageResource (обязателен `name`)
 * @param {string}   resetKey  сменился → состояние пересобирается из props
 * @param {Function} onChange  (order: string[], newFiles: Record<tempId, File>, deleted: string[])
 */
export default function ImageUploader({
                                          images = [],
                                          resetKey = 'default',
                                          maxImages = 10,
                                          multiple = true,
                                          onChange,
                                      }) {
    const [items, setItems]       = useState(() => images.map(fromServer));
    const [deleted, setDeleted]   = useState([]);
    const [preview, setPreview]   = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [toastMsg, setToastMsg] = useState(null);

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const itemsRef = useRef(items);
    itemsRef.current = items;

    /* ── Пересборка при смене страницы / после сохранения ── */
    useEffect(() => {
        itemsRef.current.forEach((i) => i.isNew && URL.revokeObjectURL(i.thumb));
        setItems(images.map(fromServer));
        setDeleted([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);

    /* ── Освобождаем blob-URL при размонтировании ── */
    useEffect(() => () => {
        itemsRef.current.forEach((i) => i.isNew && URL.revokeObjectURL(i.thumb));
    }, []);

    /** Единая точка выхода наружу: order + map файлов + удалённые. */
    const emit = useCallback((nextItems, nextDeleted) => {
        onChangeRef.current?.(
            nextItems.map((i) => i.token),
            Object.fromEntries(nextItems.filter((i) => i.isNew).map((i) => [i.tempId, i.file])),
            nextDeleted,
        );
    }, []);

    const apply = useCallback((nextItems, nextDeleted = deleted) => {
        setItems(nextItems);
        setDeleted(nextDeleted);
        emit(nextItems, nextDeleted);
    }, [deleted, emit]);

    /* ── DnD ── */
    const sensors  = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const sortIds  = useMemo(() => items.map((i) => i.key), [items]);

    const handleDragEnd = useCallback(({ active, over }) => {
        setActiveId(null);
        if (!over || active.id === over.id) return;

        const from = sortIds.indexOf(active.id);
        const to   = sortIds.indexOf(over.id);
        if (from === -1 || to === -1) return;

        apply(arrayMove(items, from, to));
    }, [items, sortIds, apply]);

    /* ── Dropzone ── */
    const handleDrop = useCallback((accepted) => {
        const free = maxImages - items.length;

        if (free <= 0) {
            setToastMsg({ severity: 'warning', text: `Максимум ${maxImages} изображений` });
            return;
        }

        const batch = accepted.slice(0, free);
        apply([...items, ...batch.map(fromFile)]);

        setToastMsg(
            batch.length < accepted.length
                ? { severity: 'warning', text: `Добавлено ${batch.length}, лимит ${maxImages}` }
                : { severity: 'success', text: `Добавлено: ${batch.length}` },
        );
    }, [items, maxImages, apply]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: handleDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
        multiple,
        disabled: items.length >= maxImages,
    });

    /* ── Удаление ── */
    const handleDelete = useCallback((index) => {
        const target = items[index];
        if (!target) return;

        if (target.isNew) URL.revokeObjectURL(target.thumb);

        apply(
            items.filter((_, i) => i !== index),
            target.isNew ? deleted : [...new Set([...deleted, target.token])],
        );
    }, [items, deleted, apply]);

    const activeItem = useMemo(
        () => items.find((i) => i.key === activeId) ?? null,
        [items, activeId],
    );

    return (
        <Box>
            {items.length < maxImages && (
                <Box
                    {...getRootProps()}
                    sx={{
                        border: '2px dashed',
                        borderColor: isDragActive ? 'primary.main' : 'grey.300',
                        borderRadius: 1, p: 3, mb: 2, textAlign: 'center', cursor: 'pointer',
                        bgcolor: isDragActive ? 'action.hover' : 'transparent',
                        transition: 'all .2s',
                        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    }}
                >
                    <input {...getInputProps()} />
                    <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary">
                        {isDragActive ? 'Отпустите файлы' : 'Перетащите изображения или кликните для выбора'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        JPEG, PNG, GIF, WebP • Макс. 10 MB • До {maxImages} изображений
                    </Typography>
                </Box>
            )}

            {items.length > 0 && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Загружено: {items.length} из {maxImages}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Перетаскивайте для изменения порядка
                        </Typography>
                    </Box>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={(e) => setActiveId(e.active.id)}
                        onDragEnd={handleDragEnd}
                        onDragCancel={() => setActiveId(null)}
                    >
                        <SortableContext items={sortIds} strategy={rectSortingStrategy}>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)',
                                        md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)',
                                    },
                                    gap: 1.5, mb: 2,
                                }}
                            >
                                {items.map((item, index) => (
                                    <SortableImage
                                        key={item.key}
                                        item={item}
                                        index={index}
                                        dragging={activeId === item.key}
                                        onDelete={handleDelete}
                                        onPreview={setPreview}
                                    />
                                ))}
                            </Box>
                        </SortableContext>

                        <DragOverlay>
                            {activeItem && (
                                <Box sx={{ width: 250, opacity: 0.85 }}>
                                    <CardMedia
                                        component="img"
                                        height="160"
                                        image={activeItem.thumb}
                                        sx={{ objectFit: 'cover', borderRadius: 1, boxShadow: 3 }}
                                    />
                                </Box>
                            )}
                        </DragOverlay>
                    </DndContext>
                </>
            )}

            <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="lg" fullWidth>
                <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
                    {preview && (
                        <img
                            src={preview}
                            alt="Предпросмотр"
                            style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain', display: 'block' }}
                            onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Snackbar
                open={Boolean(toastMsg)}
                autoHideDuration={3000}
                onClose={() => setToastMsg(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert severity={toastMsg?.severity ?? 'info'} variant="filled" onClose={() => setToastMsg(null)}>
                    {toastMsg?.text}
                </Alert>
            </Snackbar>
        </Box>
    );
}

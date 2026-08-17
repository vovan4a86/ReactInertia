import React, { memo, useCallback, useMemo, useRef } from 'react';
import { Box, Button, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { uid } from '../utils/uploads';

const SortableRow = memo(function SortableRow({ id, value, index, onChange, onRemove, onEnter }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    return (
        <Stack
            ref={setNodeRef}
            direction="row"
            spacing={1}
            alignItems="center"
            {...attributes}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            sx={{ opacity: isDragging ? 0.5 : 1 }}
        >
            <Box {...listeners} sx={{ display: 'flex', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}>
                <DragIndicatorIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
            </Box>

            <TextField
                fullWidth
                size="small"
                value={value}
                onChange={(event) => onChange(index, event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        onEnter(index);
                    }
                }}
                placeholder={`Значение ${index + 1}`}
            />

            <Tooltip title="Удалить">
                <IconButton size="small" color="error" onClick={() => onRemove(index)}>
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Stack>
    );
});

/**
 * Простой список строк (тип 5) с сортировкой.
 *
 * Ключи для dnd генерируются один раз на длину списка и живут в ref,
 * чтобы ввод текста не пересоздавал элементы.
 */
function ListInput({ value = [], onChange }) {
    const items = Array.isArray(value) ? value : [];
    const keysRef = useRef([]);

    // Держим массив ключей синхронным с длиной списка
    if (keysRef.current.length !== items.length) {
        keysRef.current = items.map((_, index) => keysRef.current[index] ?? uid());
    }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleChange = useCallback(
        (index, val) => onChange(items.map((item, i) => (i === index ? val : item))),
        [items, onChange],
    );

    const handleRemove = useCallback(
        (index) => {
            keysRef.current = keysRef.current.filter((_, i) => i !== index);
            onChange(items.filter((_, i) => i !== index));
        },
        [items, onChange],
    );

    const handleAdd = useCallback(
        (index = items.length - 1) => {
            keysRef.current = keysRef.current.toSpliced(index + 1, 0, uid());
            onChange(items.toSpliced(index + 1, 0, ''));
        },
        [items, onChange],
    );

    const handleDragEnd = useCallback(
        ({ active, over }) => {
            if (!over || active.id === over.id) return;

            const from = keysRef.current.indexOf(active.id);
            const to = keysRef.current.indexOf(over.id);

            if (from !== -1 && to !== -1) {
                keysRef.current = arrayMove(keysRef.current, from, to);
                onChange(arrayMove(items, from, to));
            }
        },
        [items, onChange],
    );

    const ids = useMemo(() => [...keysRef.current], [items.length, keysRef.current]);

    return (
        <Box>
            {items.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography color="text.secondary" variant="body2">
                        Список пуст
                    </Typography>
                </Paper>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis]}
                >
                    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                        <Stack spacing={1}>
                            {items.map((item, index) => (
                                <SortableRow
                                    key={keysRef.current[index]}
                                    id={keysRef.current[index]}
                                    value={item ?? ''}
                                    index={index}
                                    onChange={handleChange}
                                    onRemove={handleRemove}
                                    onEnter={handleAdd}
                                />
                            ))}
                        </Stack>
                    </SortableContext>
                </DndContext>
            )}

            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => handleAdd()} sx={{ mt: 2 }}>
                Добавить значение
            </Button>
        </Box>
    );
}

export default memo(ListInput);

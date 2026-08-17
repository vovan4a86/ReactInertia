import React, { memo, useCallback, useMemo } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    ContentCopy as CopyIcon,
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
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import TextFieldInput from './TextFieldInput';
import TextareaInput from './TextareaInput';
import EditorInput from './EditorInput';
import FileInput from './FileInput';
import { useSettingsForm } from '../SettingsFormContext';
import { isUploadMarker, SETTING_TYPE, uid } from '../utils/uploads';

/**
 * Одна перетаскиваемая строка повторителя.
 * Ручка drag вынесена в отдельный элемент — иначе поля ввода
 * «перехватывают» события указателя.
 */
const SortableRow = memo(function SortableRow({ row, index, fields, onRemove, onDuplicate, renderField }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: row._key,
    });

    return (
        <Card
            ref={setNodeRef}
            variant="outlined"
            {...attributes}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            sx={{ opacity: isDragging ? 0.5 : 1, position: 'relative', zIndex: isDragging ? 10 : 'auto' }}
        >
            <CardContent sx={{ pb: 1.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                            {...listeners}
                            sx={{ display: 'flex', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
                        >
                            <DragIndicatorIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                        </Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Элемент {index + 1}
                        </Typography>
                    </Stack>

                    <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Дублировать">
                            <IconButton size="small" onClick={() => onDuplicate(row._key)}>
                                <CopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить элемент">
                            <IconButton size="small" color="error" onClick={() => onRemove(row._key)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>

                <Stack spacing={2}>
                    {Object.entries(fields).map(([key, config]) => (
                        <Box key={key}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                {config.title || key}
                            </Typography>
                            {renderField(key, config, row)}
                        </Box>
                    ))}
                </Stack>
            </CardContent>
        </Card>
    );
});

/**
 * Список данных / повторитель (тип 6).
 *
 * Каждая строка имеет служебный `_key` — стабильный идентификатор для React
 * и dnd-kit. На сервер он не уходит (см. serializeValue).
 *
 * @param {object} props
 * @param {object} props.setting
 * @param {Array<object>} props.value
 * @param {(rows: Array<object>) => void} props.onChange
 */
function ListDataInput({ setting, value = [], onChange }) {
    const { releaseUpload } = useSettingsForm();

    const fields = setting.params?.fields ?? {};
    const rows = Array.isArray(value) ? value : [];

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const emptyRow = useCallback(
        () => ({
            _key: uid(),
            ...Object.fromEntries(
                Object.entries(fields).map(([key, config]) => [
                    key,
                    Number(config.type) === SETTING_TYPE.FILE ? null : '',
                ]),
            ),
        }),
        [fields],
    );

    const handleAdd = useCallback(() => onChange([...rows, emptyRow()]), [rows, onChange, emptyRow]);

    /** Удаление строки освобождает связанные незагруженные файлы. */
    const handleRemove = useCallback(
        (key) => {
            const row = rows.find((item) => item._key === key);

            Object.values(row ?? {}).forEach((val) => {
                if (isUploadMarker(val)) releaseUpload(val);
            });

            onChange(rows.filter((item) => item._key !== key));
        },
        [rows, onChange, releaseUpload],
    );

    /** Дубликат не копирует незагруженные файлы — иначе один File был бы в двух строках. */
    const handleDuplicate = useCallback(
        (key) => {
            const index = rows.findIndex((item) => item._key === key);
            if (index === -1) return;

            const clone = Object.fromEntries(
                Object.entries(rows[index]).map(([field, val]) => [field, isUploadMarker(val) ? null : val]),
            );

            onChange(rows.toSpliced(index + 1, 0, { ...clone, _key: uid() }));
        },
        [rows, onChange],
    );

    const handleFieldChange = useCallback(
        (key, field, val) => {
            onChange(rows.map((row) => (row._key === key ? { ...row, [field]: val } : row)));
        },
        [rows, onChange],
    );

    const handleDragEnd = useCallback(
        ({ active, over }) => {
            if (!over || active.id === over.id) return;

            const from = rows.findIndex((row) => row._key === active.id);
            const to = rows.findIndex((row) => row._key === over.id);

            if (from !== -1 && to !== -1) onChange(arrayMove(rows, from, to));
        },
        [rows, onChange],
    );

    /** Рендер поля строки согласно его типу из params.fields. */
    const renderField = useCallback(
        (field, config, row) => {
            const onFieldChange = (val) => handleFieldChange(row._key, field, val);
            const common = {
                value: row[field] ?? '',
                onChange: onFieldChange,
                placeholder: config.title,
                fullWidth: true,
            };

            switch (Number(config.type)) {
                case SETTING_TYPE.TEXTAREA:
                    return <TextareaInput {...common} rows={3} />;
                case SETTING_TYPE.EDITOR:
                    return <EditorInput {...common} />;
                case SETTING_TYPE.FILE:
                    return (
                        <FileInput
                            setting={setting}
                            value={row[field] ?? null}
                            onChange={onFieldChange}
                            hint=""
                        />
                    );
                default:
                    return <TextFieldInput {...common} />;
            }
        },
        [handleFieldChange, setting],
    );

    const sortableIds = useMemo(() => rows.map((row) => row._key), [rows]);

    if (Object.keys(fields).length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">
                    Для этого списка не настроены поля. Откройте настройку и добавьте их.
                </Typography>
            </Paper>
        );
    }

    return (
        <Box>
            {rows.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        Нет элементов. Нажмите «Добавить элемент».
                    </Typography>
                </Paper>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                >
                    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                        <Stack spacing={2}>
                            {rows.map((row, index) => (
                                <SortableRow
                                    key={row._key}
                                    row={row}
                                    index={index}
                                    fields={fields}
                                    onRemove={handleRemove}
                                    onDuplicate={handleDuplicate}
                                    renderField={renderField}
                                />
                            ))}
                        </Stack>
                    </SortableContext>
                </DndContext>
            )}

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleAdd}>
                    Добавить элемент
                </Button>
                {rows.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                        Всего элементов: {rows.length}
                    </Typography>
                )}
            </Stack>
        </Box>
    );
}

export default memo(ListDataInput);

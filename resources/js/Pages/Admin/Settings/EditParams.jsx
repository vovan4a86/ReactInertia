import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    FormControl,
    IconButton,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    ContentCopy as CopyIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIcon,
} from '@mui/icons-material';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SETTING_TYPE, uid } from './utils/uploads';
import {
    collectRenames,
    destructiveChanges,
    fieldTypeOptions,
    fieldsToRows,
    rowsToFields,
    slugifyKey,
    validateRows,
} from './utils/fields';

const EMPTY_FIELDS = Object.freeze({});

/**
 * Одна строка редактора полей.
 * Вынесена в memo-компонент: при перетаскивании перерисовывается только она.
 */
const FieldRow = memo(function FieldRow({ row, error, typeOptions, onChange, onDuplicate, onRemove }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: row.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 1 : 0,
        opacity: isDragging ? 0.6 : 1,
        backgroundColor: isDragging ? 'action.hover' : undefined,
    };

    return (
        <TableRow ref={setNodeRef} style={style} hover>
            <TableCell padding="checkbox">
                <IconButton
                    size="small"
                    {...attributes}
                    {...listeners}
                    sx={{ cursor: 'grab', touchAction: 'none', '&:active': { cursor: 'grabbing' } }}
                    aria-label="Переместить поле"
                >
                    <DragIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                </IconButton>
            </TableCell>

            <TableCell>
                <TextField
                    fullWidth
                    size="small"
                    value={row.title}
                    onChange={(event) => onChange(row.id, { title: event.target.value })}
                    placeholder="Например: Заголовок блока"
                />
            </TableCell>

            <TableCell>
                <TextField
                    fullWidth
                    size="small"
                    value={row.key}
                    onChange={(event) => onChange(row.id, { key: event.target.value, keyTouched: true })}
                    onBlur={(event) => onChange(row.id, { key: event.target.value.trim() })}
                    placeholder="block_title"
                    required
                    error={Boolean(error)}
                    helperText={error}
                    slotProps={{ htmlInput: { spellCheck: false, autoCapitalize: 'off', autoCorrect: 'off' } }}
                />
            </TableCell>

            <TableCell>
                <FormControl fullWidth size="small">
                    <Select
                        value={row.type}
                        onChange={(event) => onChange(row.id, { type: Number(event.target.value) })}
                    >
                        {typeOptions.map(({ value, label }) => (
                            <MenuItem key={value} value={value}>
                                {label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </TableCell>

            <TableCell padding="checkbox">
                <Stack direction="row">
                    <Tooltip title="Дублировать">
                        <IconButton size="small" onClick={() => onDuplicate(row.id)}>
                            <CopyIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить поле">
                        <IconButton size="small" color="error" onClick={() => onRemove(row.id)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </TableCell>
        </TableRow>
    );
});

/**
 * Редактор структуры под-полей составных настроек («Данные» и «Список данных»).
 *
 * Что изменилось по сравнению с прежней версией:
 *  - ключ поля редактируется как локальный черновик и переименовывается разом,
 *    а не на каждое нажатие клавиши (раньше при вводе первого символа ключ уже
 *    переписывался, а совпадение с существующим молча отбрасывало правку);
 *  - строки имеют стабильный id, поэтому React-состояние и ошибки больше не
 *    «съезжают» при добавлении/удалении (раньше key={index});
 *  - иконка перетаскивания стала рабочей (@dnd-kit), порядок сохраняется в
 *    поле `order`, а не зависит от порядка ключей JSON-объекта;
 *  - переименования собираются в карту field_renames — бэкенд переносит
 *    сохранённые значения на новые ключи, раньше они терялись;
 *  - onChange отдаёт params целиком (merge), а не только { fields }.
 *
 * @param {object} props
 * @param {number} props.type Тип настройки (SETTING_TYPE.DATA | LIST_DATA)
 * @param {object} props.params Текущие params настройки
 * @param {Record<number, string>} [props.fieldTypes] Подписи допустимых типов полей
 * @param {Record<number, string>} [props.types] Подписи всех типов (фоллбэк)
 * @param {(params: object, meta: {renames: object, valid: boolean}) => void} props.onChange
 */
export default function EditParams({ type, params, fieldTypes, types, onChange }) {
    const incoming = params?.fields ?? EMPTY_FIELDS;

    const [rows, setRows] = useState(() => fieldsToRows(incoming));
    const seenRef = useRef(incoming);
    const emittedRef = useRef(null);
    const originalFieldsRef = useRef(incoming);

    // Синхронизация с внешним изменением props (например, смена типа настройки
    // сбрасывает params). Обновление состояния во время рендера — штатный
    // приём React вместо useEffect: лишнего кадра не будет.
    if (incoming !== seenRef.current) {
        seenRef.current = incoming;

        if (incoming !== emittedRef.current) {
            setRows(fieldsToRows(incoming));
        }
    }

    const { errors, valid } = useMemo(() => validateRows(rows), [rows]);
    const typeOptions = useMemo(() => fieldTypeOptions(fieldTypes ?? types), [fieldTypes, types]);
    const warnings = useMemo(() => destructiveChanges(originalFieldsRef.current, rows), [rows]);

    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    });

    /** Единая точка публикации изменений наверх. */
    const commit = useCallback((nextRows) => {
        setRows(nextRows);

        const fields = rowsToFields(nextRows);
        emittedRef.current = fields;

        onChangeRef.current?.(
            { ...(params ?? {}), fields },
            { renames: collectRenames(nextRows), valid: validateRows(nextRows).valid },
        );
    }, [params]);

    const handleRowChange = useCallback((id, patch) => {
        commit(rows.map((row) => {
            if (row.id !== id) return row;

            const updated = { ...row, ...patch };

            // Ключ подставляется из названия, пока пользователь не правил его вручную.
            if (patch.title !== undefined && !row.keyTouched && !row.originalKey) {
                updated.key = slugifyKey(patch.title);
            }

            return updated;
        }));
    }, [commit, rows]);

    const handleAdd = useCallback(() => {
        commit([
            ...rows,
            { id: uid(), key: '', originalKey: null, title: '', type: SETTING_TYPE.TEXT, keyTouched: false },
        ]);
    }, [commit, rows]);

    const handleDuplicate = useCallback((id) => {
        const index = rows.findIndex((row) => row.id === id);

        if (index === -1) return;

        const source = rows[index];
        const taken = new Set(rows.map((row) => row.key));

        let key = `${source.key || 'field'}_copy`;
        let suffix = 2;

        while (taken.has(key)) {
            key = `${source.key || 'field'}_copy_${suffix++}`;
        }

        const copy = { ...source, id: uid(), key, originalKey: null, keyTouched: true };

        commit([...rows.slice(0, index + 1), copy, ...rows.slice(index + 1)]);
    }, [commit, rows]);

    const handleRemove = useCallback((id) => {
        commit(rows.filter((row) => row.id !== id));
    }, [commit, rows]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = useCallback(({ active, over }) => {
        if (!over || active.id === over.id) return;

        const from = rows.findIndex((row) => row.id === active.id);
        const to = rows.findIndex((row) => row.id === over.id);

        if (from !== -1 && to !== -1) {
            commit(arrayMove(rows, from, to));
        }
    }, [commit, rows]);

    const ids = useMemo(() => rows.map((row) => row.id), [rows]);

    return (
        <Box>
            {/*
              * DndContext обязан находиться СНАРУЖИ <Table>.
              *
              * Он не является «невидимым» провайдером: помимо контекста он рендерит
              * блок доступности (screen-reader instructions + aria-live регион) —
              * два <div> прямо в месте вызова. Внутри <TableBody> это даёт
              * «In HTML, <div> cannot be a child of <tbody>»: браузер выкидывает
              * такие узлы из таблицы при парсинге, DOM расходится с деревом React,
              * и на следующей гидрации/перерисовке ломается сопоставление узлов.
              *
              * SortableContext, напротив, DOM не создаёт (только контекст),
              * поэтому он спокойно живёт внутри <TableBody> и оборачивает <tr>.
              */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragEnd={handleDragEnd}
            >
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell width={44} padding="checkbox" />
                                <TableCell>Название поля</TableCell>
                                <TableCell width={220}>Ключ *</TableCell>
                                <TableCell width={200}>Тип</TableCell>
                                <TableCell width={88} padding="checkbox" />
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                        <Typography color="text.secondary" gutterBottom>
                                            Нет настроенных полей
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Добавьте поля, которые будут отображаться в этой настройке
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                                    {rows.map((row) => (
                                        <FieldRow
                                            key={row.id}
                                            row={row}
                                            error={errors[row.id]}
                                            typeOptions={typeOptions}
                                            onChange={handleRowChange}
                                            onDuplicate={handleDuplicate}
                                            onRemove={handleRemove}
                                        />
                                    ))}
                                </SortableContext>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DndContext>

            <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1 }}>
                <Button size="small" variant="text" startIcon={<AddIcon />} onClick={handleAdd}>
                    Добавить поле
                </Button>

                {rows.length > 0 && (
                    <>
                        <Chip size="small" variant="outlined" label={`Полей: ${rows.length}`} sx={{ height: 22 }} />
                        {!valid && (
                            <Typography variant="caption" color="error">
                                Исправьте ключи полей — иначе они не сохранятся
                            </Typography>
                        )}
                    </>
                )}
            </Stack>

            {warnings.length > 0 && (
                <Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
                    После сохранения будут удалены файлы полей: <strong>{warnings.join(', ')}</strong>.
                    Поле удалено или его тип больше не «Файл».
                </Alert>
            )}

            <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                <Typography variant="body2">
                    Ключ — это имя поля в сохранённом значении
                    {type === SETTING_TYPE.LIST_DATA ? ' каждой строки списка' : ''}: {' '}
                    <code>{`Setting::get('code')['${rows[0]?.key || 'key'}']`}</code>.
                    Переименование ключа безопасно — сохранённые значения переедут автоматически.
                </Typography>
            </Alert>
        </Box>
    );
}

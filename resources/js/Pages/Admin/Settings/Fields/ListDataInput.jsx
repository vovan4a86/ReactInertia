import React, {useState} from 'react';
import {
    Box,
    IconButton,
    Card,
    CardContent,
    Paper,
    Button,
    Typography
} from '@mui/material';
import {
    Delete as DeleteIcon,
    DragIndicator as DragIndicatorIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import TextFieldInput from './TextFieldInput';
import TextareaInput from './TextareaInput';
import EditorInput from './EditorInput';
import FileInput from './FileInput';

import {
    DndContext,
    closestCenter,
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

function SortableItem({ id, children }) {
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
        position: 'relative',
        zIndex: isDragging ? 1000 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {React.cloneElement(children, { dragListeners: listeners })}
        </div>
    );
}

function ListItemCard({ item, index, fieldKeys, fields, onRemove, onItemChange, renderField, dragListeners }) {
    return (
        <Card variant="outlined">
            <CardContent sx={{ pb: 1 }}>
                {/* Заголовок карточки с кнопкой удаления и перетаскиванием */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                            {...dragListeners}
                            sx={{
                                cursor: 'grab',
                                display: 'flex',
                                alignItems: 'center',
                                '&:active': { cursor: 'grabbing' },
                            }}
                        >
                            <DragIndicatorIcon
                                sx={{
                                    color: 'text.disabled',
                                    fontSize: 20,
                                }}
                            />
                        </Box>
                        <Typography variant="subtitle2" color="textSecondary">
                            Элемент {index + 1}
                        </Typography>
                    </Box>
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => onRemove(index)}
                        title="Удалить элемент"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Поля в столбик */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {fieldKeys.map(field => (
                        <Box key={field}>
                            <Typography
                                variant="caption"
                                color="textSecondary"
                                sx={{ mb: 0.5, display: 'block' }}
                            >
                                {fields[field].title}
                            </Typography>
                            {renderField(field, fields[field], item, index)}
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
}

export default function ListDataInput({
                                          setting,
                                          name,
                                          value = [],
                                          onChange,
                                          onFileChange,
                                          getFileUrl,
                                          fileUrls = {},
                                      }) {
    const fields = setting.params?.fields || {};
    const items = Array.isArray(value) ? value : [];
    const fieldKeys = Object.keys(fields);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleAdd = () => {
        const newItem = { _key: `item-${Date.now()}-${Math.random()}` };
        fieldKeys.forEach(field => {
            newItem[field] = '';
        });
        onChange([...items, newItem]);
    };

    const handleRemove = (index) => {
        onChange(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, val) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: val };
        onChange(newItems);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = items.findIndex(item => (item._key || `item-${items.indexOf(item)}`) === active.id);
            const newIndex = items.findIndex(item => (item._key || `item-${items.indexOf(item)}`) === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newItems = arrayMove(items, oldIndex, newIndex);
                onChange(newItems);
            }
        }
    };

    const renderField = (field, params, item, index) => {
        // Правильный формат имени файла для вложенных элементов
        const fileInputName = `${name}.${index}.${field}`;
        const fieldInputName = `${name}[${index}][${field}]`;

        switch (params.type) {
            case 0:
                return (
                    <TextFieldInput
                        name={fieldInputName}
                        value={item[field] || ''}
                        onChange={(val) => handleItemChange(index, field, val)}
                        placeholder={params.title}
                        fullWidth
                    />
                );

            case 1:
                return (
                    <TextareaInput
                        name={fieldInputName}
                        value={item[field] || ''}
                        onChange={(val) => handleItemChange(index, field, val)}
                        placeholder={params.title}
                        rows={2}
                        fullWidth
                    />
                );

            case 2:
                return (
                    <EditorInput
                        name={fieldInputName}
                        value={item[field] || ''}
                        onChange={(val) => handleItemChange(index, field, val)}
                    />
                );

            case 3:
                return (
                    <FileInput
                        name={`${name}[${index}][${field}]`}
                        value={item[field]}
                        fileUrl={
                            getFileUrl(item[field], fileUrls, field) ||
                            (fileUrls[index] && fileUrls[index][field]) ||
                            fileUrls[item[field]]
                        }
                        onChange={(val) => handleItemChange(index, field, val)}
                        onFileChange={onFileChange}
                        placeholder={params.title}
                    />
                );

            default:
                return (
                    <TextFieldInput
                        name={fieldInputName}
                        value={item[field] || ''}
                        onChange={(val) => handleItemChange(index, field, val)}
                        placeholder={params.title}
                        fullWidth
                    />
                );
        }
    };

    if (fieldKeys.length === 0) {
        return (
            <Box sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography color="textSecondary">Нет настроенных полей для этого списка</Typography>
            </Box>
        );
    }

    return (
        <Box>
            {items.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="textSecondary" sx={{ mb: 1 }}>
                        Нет элементов. Нажмите "Добавить" для создания.
                    </Typography>
                </Paper>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis]}
                >
                    <SortableContext
                        items={items.map(item => item._key || `item-${items.indexOf(item)}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {items.map((item, index) => {
                                const itemKey = item._key || `item-${index}`;
                                return (
                                    <SortableItem key={itemKey} id={itemKey}>
                                        <ListItemCard
                                            item={item}
                                            index={index}
                                            fieldKeys={fieldKeys}
                                            fields={fields}
                                            onRemove={handleRemove}
                                            onItemChange={handleItemChange}
                                            renderField={renderField}
                                        />
                                    </SortableItem>
                                );
                            })}
                        </Box>
                    </SortableContext>
                </DndContext>
            )}

            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAdd}
                    variant="outlined"
                >
                    Добавить элемент
                </Button>

                {items.length > 0 && (
                    <Typography variant="caption" color="textSecondary">
                        Всего элементов: {items.length}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}


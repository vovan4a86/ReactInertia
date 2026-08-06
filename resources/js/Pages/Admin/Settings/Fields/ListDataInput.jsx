import React, {useState, useEffect} from 'react';
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

    // Состояние для локальных fileUrls, которые будут обновляться при перетаскивании
    const [localFileUrls, setLocalFileUrls] = useState(() => {
        // Инициализируем из props
        return { ...fileUrls };
    });

    // Синхронизируем localFileUrls с props когда они приходят с сервера
    useEffect(() => {
        setLocalFileUrls(prev => {
            // Если пришли новые fileUrls с сервера - используем их
            if (Object.keys(fileUrls).length > 0) {
                return { ...fileUrls };
            }
            return prev;
        });
    }, [fileUrls]);

    // Отслеживаем изменения value для синхронизации fileUrls
    useEffect(() => {
        // Создаем маппинг старых файлов по их значениям
        const fileValueToUrl = {};
        Object.entries(localFileUrls).forEach(([index, fields]) => {
            if (items[index] && fields) {
                Object.entries(fields).forEach(([field, url]) => {
                    if (items[index][field]) {
                        fileValueToUrl[items[index][field]] = { index, field, url };
                    }
                });
            }
        });

        // Перестраиваем fileUrls в соответствии с новым порядком items
        const newFileUrls = {};
        items.forEach((item, newIndex) => {
            Object.entries(item).forEach(([field, fieldValue]) => {
                if (typeof fieldValue === 'string' && fieldValue) {
                    const fileInfo = fileValueToUrl[fieldValue];
                    if (fileInfo) {
                        if (!newFileUrls[newIndex]) {
                            newFileUrls[newIndex] = {};
                        }
                        newFileUrls[newIndex][field] = fileInfo.url;
                    }
                }
            });
        });

        setLocalFileUrls(newFileUrls);
    }, [value, items]);

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

        // Обновляем localFileUrls при удалении элемента
        const newFileUrls = {};
        newItems.forEach((item, newIndex) => {
            const oldIndex = items.findIndex(oldItem =>
                oldItem._key === item._key ||
                JSON.stringify(oldItem) === JSON.stringify(item)
            );
            if (oldIndex !== -1 && localFileUrls[oldIndex]) {
                newFileUrls[newIndex] = { ...localFileUrls[oldIndex] };
            }
        });
        setLocalFileUrls(newFileUrls);

        onChange(newItems);
    };

    const handleItemChange = (index, field, val) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: val };

        // Если поле очистилось - удаляем URL из localFileUrls
        if (!val && localFileUrls[index] && localFileUrls[index][field]) {
            const newFileUrls = { ...localFileUrls };
            if (newFileUrls[index]) {
                delete newFileUrls[index][field];
                if (Object.keys(newFileUrls[index]).length === 0) {
                    delete newFileUrls[index];
                }
            }
            setLocalFileUrls(newFileUrls);
        }

        onChange(newItems);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = items.findIndex(item => (item._key || `item-${items.indexOf(item)}`) === active.id);
            const newIndex = items.findIndex(item => (item._key || `item-${items.indexOf(item)}`) === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Синхронизируем fileUrls с новым порядком
                const newFileUrls = {};
                Object.entries(localFileUrls).forEach(([index, fields]) => {
                    let newPosition;
                    if (parseInt(index) === oldIndex) {
                        newPosition = newIndex;
                    } else if (parseInt(index) === newIndex) {
                        newPosition = oldIndex;
                    } else {
                        newPosition = parseInt(index);
                    }
                    newFileUrls[newPosition] = { ...fields };
                });

                setLocalFileUrls(newFileUrls);
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
                            // Используем localFileUrls вместо fileUrls из props
                            getFileUrl(item[field], localFileUrls, field, index)
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


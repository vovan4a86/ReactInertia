import React from 'react';
import {
    Box,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
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

export default function ListDataInput({
                                          setting,
                                          name,
                                          value = [],
                                          onChange,
                                          onFileChange,
                                          getFileUrl,
                                      }) {
    const fields = setting.params?.fields || {};
    const items = Array.isArray(value) ? value : [];
    const fieldKeys = Object.keys(fields);

    const handleAdd = () => {
        const newItem = {};
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

    const renderField = (field, params, item, index) => {
        // Правильный формат имени файла для вложенных элементов
        // settings.{settingId}.{index}.{field}
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
                        name={fileInputName}
                        value={item[field]}
                        fileUrl={getFileUrl(item[field], item._fileUrls, field)}
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {items.map((item, index) => (
                        <Card key={index} variant="outlined">
                            <CardContent sx={{ pb: 1 }}>
                                {/* Заголовок карточки с кнопкой удаления */}
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 2,
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <DragIndicatorIcon
                                            sx={{
                                                color: 'text.disabled',
                                                cursor: 'grab',
                                                fontSize: 20,
                                            }}
                                        />
                                        <Typography variant="subtitle2" color="textSecondary">
                                            Элемент {index + 1}
                                        </Typography>
                                    </Box>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleRemove(index)}
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
                    ))}
                </Box>
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

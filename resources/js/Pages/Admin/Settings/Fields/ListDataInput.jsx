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
    Paper,
    Button,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    DragIndicator as DragIcon,
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
        const fieldName = `${name}[${field}][${index}]`;

        switch (params.type) {
            case 0:
                return (
                    <TextFieldInput
                        name={fieldName}
                        value={item[field] || ''}
                        onChange={(val) => handleItemChange(index, field, val)}
                        placeholder={params.title}
                    />
                );

            case 1:
                return (
                    <TextareaInput
                        name={fieldName}
                        value={item[field] || ''}
                        onChange={(val) => handleItemChange(index, field, val)}
                        placeholder={params.title}
                        rows={2}
                    />
                );

            case 2:
                return (
                    <EditorInput
                        name={fieldName}
                        value={item[field] || ''}
                        onChange={(val) => handleItemChange(index, field, val)}
                    />
                );

            case 3:
                return (
                    <FileInput
                        name={fieldName}
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
                        name={fieldName}
                        value={item[field] || ''}
                        onChange={(val) => handleItemChange(index, field, val)}
                        placeholder={params.title}
                    />
                );
        }
    };

    // Если нет полей, показываем сообщение
    if (fieldKeys.length === 0) {
        return (
            <Box sx={{ p: 2, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <p>Нет настроенных полей для этого списка</p>
            </Box>
        );
    }

    return (
        <Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small" sx={{ minWidth: 650 }}>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell width={40} padding="checkbox" />
                            {fieldKeys.map(field => (
                                <TableCell key={field} sx={{ fontWeight: 600 }}>
                                    {fields[field].title}
                                </TableCell>
                            ))}
                            <TableCell width={40} padding="checkbox" />
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={fieldKeys.length + 2}
                                    align="center"
                                    sx={{ py: 3, color: 'text.secondary' }}
                                >
                                    Нет элементов. Нажмите "Добавить" для создания.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item, index) => (
                                <TableRow
                                    key={index}
                                    hover
                                    sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                                >
                                    <TableCell padding="checkbox">
                                        <DragIcon
                                            sx={{
                                                color: 'text.disabled',
                                                cursor: 'grab',
                                                fontSize: 20,
                                            }}
                                        />
                                    </TableCell>

                                    {fieldKeys.map(field => (
                                        <TableCell key={field} sx={{ py: 1 }}>
                                            {renderField(field, fields[field], item, index)}
                                        </TableCell>
                                    ))}

                                    <TableCell padding="checkbox">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleRemove(index)}
                                            title="Удалить элемент"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 1 }}>
                <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAdd}
                    variant="text"
                >
                    Добавить элемент
                </Button>

                {items.length > 0 && (
                    <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ ml: 2 }}
                    >
                        Всего элементов: {items.length}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}

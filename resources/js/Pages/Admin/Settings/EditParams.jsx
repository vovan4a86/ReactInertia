import React from 'react';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    TextField,
    Select,
    MenuItem,
    FormControl,
    Button,
    Typography,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Add as AddIcon,
    DragIndicator as DragIcon,
} from '@mui/icons-material';

export default function EditParams({ type, params, types, onChange }) {
    const fields = params?.fields || {};
    const fieldKeys = Object.keys(fields);

    const handleAddField = () => {
        const newKey = `field_${Date.now()}`;
        const newFields = {
            ...fields,
            [newKey]: {
                type: 0,
                title: '',
            },
        };
        onChange({ fields: newFields });
    };

    const handleRemoveField = (key) => {
        const newFields = { ...fields };
        delete newFields[key];
        onChange({ fields: newFields });
    };

    const handleFieldChange = (key, field, value) => {
        const newFields = {
            ...fields,
            [key]: {
                ...fields[key],
                [field]: value,
            },
        };
        onChange({ fields: newFields });
    };

    const handleKeyChange = (oldKey, newKey) => {
        if (oldKey === newKey || !newKey.trim()) return;

        const newFields = {};
        Object.entries(fields).forEach(([key, value]) => {
            if (key === oldKey) {
                newFields[newKey] = value;
            } else {
                newFields[key] = value;
            }
        });
        onChange({ fields: newFields });
    };

    // Available types for sub-fields
    const availableTypes = Object.entries(types)
        .filter(([value]) => ['0', '1', '2', '3'].includes(value))
        .reduce((acc, [value, label]) => {
            acc[value] = label;
            return acc;
        }, {});

    return (
        <Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell width={40} padding="checkbox" />
                            <TableCell>Название поля</TableCell>
                            <TableCell width={200}>Ключ</TableCell>
                            <TableCell width={200}>Тип</TableCell>
                            <TableCell width={40} padding="checkbox" />
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {fieldKeys.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                    <Typography color="textSecondary" gutterBottom>
                                        Нет настроенных полей
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        Добавьте поля, которые будут отображаться в этой настройке
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            fieldKeys.map((key) => (
                                <TableRow key={key} hover>
                                    <TableCell padding="checkbox">
                                        <DragIcon
                                            sx={{
                                                color: 'text.disabled',
                                                cursor: 'grab',
                                                fontSize: 20,
                                            }}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={fields[key].title || ''}
                                            onChange={(e) => handleFieldChange(key, 'title', e.target.value)}
                                            placeholder="Название поля"
                                            variant="outlined"
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={key}
                                            onChange={(e) => handleKeyChange(key, e.target.value)}
                                            placeholder="Ключ"
                                            variant="outlined"
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <FormControl fullWidth size="small">
                                            <Select
                                                value={fields[key].type || 0}
                                                onChange={(e) => handleFieldChange(key, 'type', parseInt(e.target.value))}
                                            >
                                                {Object.entries(availableTypes).map(([value, label]) => (
                                                    <MenuItem key={value} value={parseInt(value)}>
                                                        {label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </TableCell>

                                    <TableCell padding="checkbox">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleRemoveField(key)}
                                            title="Удалить поле"
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

            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddField}
                    variant="text"
                >
                    Добавить поле
                </Button>

                {fieldKeys.length > 0 && (
                    <Typography variant="caption" color="textSecondary">
                        Всего полей: {fieldKeys.length}
                    </Typography>
                )}
            </Box>

            {/* Help text */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                <Typography variant="body2" color="textSecondary">
                    <strong>Подсказка:</strong> Здесь вы можете настроить поля для отображения в типах
                    "Данные" и "Список данных". Каждое поле может быть текстовым, текстовой областью,
                    редактором или файлом.
                </Typography>
            </Box>
        </Box>
    );
}

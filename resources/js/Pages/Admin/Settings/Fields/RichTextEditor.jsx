import React from 'react';
import { Box, TextField } from '@mui/material';

// Это заглушка для подключения реального редактора (TinyMCE, CKEditor, и т.д.)
// Замените содержимое на реальную интеграцию

export default function RichTextEditor({
                                           name,
                                           value,
                                           onChange,
                                           placeholder = 'Введите текст...',
                                           ...props
                                       }) {
    const handleChange = (e) => {
        onChange(e.target.value);
    };

    return (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
            <Box sx={{
                mb: 1,
                pb: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                color: 'text.secondary',
                fontSize: '0.875rem',
            }}>
                Редактор не подключен. Используется текстовое поле.
            </Box>
            <TextField
                fullWidth
                multiline
                rows={10}
                name={name}
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                variant="outlined"
                size="small"
                {...props}
            />
        </Box>
    );
}

import React, { lazy, Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import TextareaInput from './TextareaInput';

// Ленивая загрузка редактора (можно заменить на любой WYSIWYG редактор)
const Editor = lazy(() => import('./RichTextEditor'));

export default function EditorInput({
                                        name,
                                        value,
                                        onChange,
                                        placeholder = 'Введите текст...',
                                        ...props
                                    }) {
    // Если редактор не нужен, используем textarea как запасной вариант
    const useSimpleEditor = true; // Измените на false при подключении редактора

    if (useSimpleEditor) {
        return (
            <TextareaInput
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={10}
                {...props}
            />
        );
    }

    return (
        <Suspense fallback={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="textSecondary">
                    Загрузка редактора...
                </Typography>
            </Box>
        }>
            <Editor
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                {...props}
            />
        </Suspense>
    );
}

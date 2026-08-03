import React, { lazy, Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import TextareaInput from './TextareaInput';
import RichTextEditor from './RichTextEditor.jsx';

export default function EditorInput({
                                        name,
                                        value,
                                        onChange,
                                        placeholder = 'Введите текст...',
                                        useRichEditor = true, // Можно переключать между редакторами
                                        ...props
                                    }) {
    if (!useRichEditor) {
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
        <RichTextEditor
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            {...props}
        />
    );
}

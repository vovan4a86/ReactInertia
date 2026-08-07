import React, { useEffect } from 'react';
import {
    Box,
    Typography,
    Chip,
} from '@mui/material';
import TextFieldInput from './TextFieldInput';
import TextareaInput from './TextareaInput';
import EditorInput from './EditorInput';
import FileInput from './FileInput';

import TextFieldsIcon from '@mui/icons-material/TextFields';
import SubjectIcon from '@mui/icons-material/Subject';
import EditIcon from '@mui/icons-material/Edit';
import AttachFileIcon from '@mui/icons-material/AttachFile';

const FIELD_TYPE_ICONS = {
    0: TextFieldsIcon,
    1: SubjectIcon,
    2: EditIcon,
    3: AttachFileIcon,
};

const FIELD_TYPE_LABELS = {
    0: 'Текст',
    1: 'Текстовое поле',
    2: 'Редактор',
    3: 'Файл',
};

export default function DataFields({ setting, name, value, onChange, onFileChange, getFileUrl }) {
    const fields = setting.params?.fields || {};

    // Добавляем отладку
    useEffect(() => {
        console.log('DataFields received value:', value);
        console.log('DataFields fields:', fields);
    }, [value, fields]);

    if (Object.keys(fields).length === 0) {
        return (
            <Typography color="text.secondary" variant="body2" sx={{ py: 2, textAlign: 'center' }}>
                Нет настраиваемых полей
            </Typography>
        );
    }

    const handleFieldChange = (field, val) => {
        if (typeof val === 'string' && val.startsWith('settings[')) return;
        const newValue = {
            ...(value || {}),
            [field]: val
        };

        onChange(newValue);
    };

    const handleFileChange = (field) => (key, file) => {
        const fileKey = `${name}[${field}]`;
        onFileChange(fileKey, file);
    };

    return (
        <Box>
            <Typography
                variant="overline"
                color="text.secondary"
                sx={{ mb: 1, display: 'block' }}
            >
                Поля данных ({Object.keys(fields).length})
            </Typography>

            <Box component="dl" sx={{
                '& dt': { mb: 0.5 },
                '& dd': { mb: 3, ml: 0 },
            }}>
                {Object.entries(fields).map(([field, params]) => {
                    const TypeIcon = FIELD_TYPE_ICONS[params.type] || TextFieldsIcon;
                    const hasValue = value[field] && value[field] !== '';

                    const commonProps = {
                        name: `${name}[${field}]`,
                        value: value[field] || '',
                        onChange: (val) => handleFieldChange(field, val),
                        placeholder: params.title,
                    };

                    return (
                        <React.Fragment key={field}>
                            {/* Заголовок */}
                            <Box component="dt" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TypeIcon
                                    color={hasValue ? 'primary' : 'action'}
                                    fontSize="small"
                                />
                                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                    {params.title}
                                </Typography>
                                <Chip
                                    label={FIELD_TYPE_LABELS[params.type]}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                                {!hasValue && (
                                    <Chip
                                        label="Пусто"
                                        size="small"
                                        color="warning"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                    />
                                )}
                            </Box>

                            {/* Поле ввода */}
                            <Box component="dd">
                                {params.type === 0 && <TextFieldInput {...commonProps} />}
                                {params.type === 1 && <TextareaInput {...commonProps} rows={3} />}
                                {params.type === 2 && <EditorInput {...commonProps} />}
                                {params.type === 3 && (
                                    <FileInput
                                        {...commonProps}
                                        fileUrl={getFileUrl(value[field], setting.file_urls, field)}
                                        onFileChange={handleFileChange(field)}
                                    />
                                )}
                            </Box>
                        </React.Fragment>
                    );
                })}
            </Box>
        </Box>
    );
}

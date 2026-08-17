import React, { memo, useCallback } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import {
    AttachFile as AttachFileIcon,
    Edit as EditIcon,
    Subject as SubjectIcon,
    TextFields as TextFieldsIcon,
} from '@mui/icons-material';

import TextFieldInput from './TextFieldInput';
import TextareaInput from './TextareaInput';
import EditorInput from './EditorInput';
import FileInput from './FileInput';
import { SETTING_TYPE } from '../utils/uploads';

/** Иконки и подписи типов под-полей. */
const FIELD_META = {
    [SETTING_TYPE.TEXT]: { Icon: TextFieldsIcon, label: 'Текст' },
    [SETTING_TYPE.TEXTAREA]: { Icon: SubjectIcon, label: 'Текстовая область' },
    [SETTING_TYPE.EDITOR]: { Icon: EditIcon, label: 'Редактор' },
    [SETTING_TYPE.FILE]: { Icon: AttachFileIcon, label: 'Файл' },
};

/**
 * Составная настройка «Данные» (тип 4) — объект с фиксированным набором полей.
 *
 * @param {object} props
 * @param {object} props.setting
 * @param {Record<string, unknown>} props.value
 * @param {(value: Record<string, unknown>) => void} props.onChange
 */
function DataFields({ setting, value = {}, onChange }) {
    const fields = setting.params?.fields ?? {};

    const handleChange = useCallback(
        (field, val) => onChange({ ...(value ?? {}), [field]: val }),
        [value, onChange],
    );

    if (Object.keys(fields).length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    Поля не настроены. Откройте настройку и добавьте их.
                </Typography>
            </Paper>
        );
    }

    const handleFieldChange = (field, val) => {
        const fieldConfig = fields[field];
        const isFileField = fieldConfig?.type === 3;

        if (!isFileField && typeof val === 'string' && val.startsWith('settings[')) {
            console.warn('Ignoring marker for non-file field:', field, val);
            return;
        }

        const newValue = {
            ...(value || {}),
            [field]: val
        };

        onChange(newValue);
    };

    const handleFileChange = (field) => (key, file) => {
        // const fileKey = `${name}[${field}]`;
        // onFileChange(fileKey, file);
        onFileChange(key, file);
    };

    return (
        <Box>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Поля данных ({Object.keys(fields).length})
            </Typography>

            <Stack spacing={2.5}>
                {Object.entries(fields).map(([field, config]) => {
                    const type = Number(config.type);
                    const { Icon, label } = FIELD_META[type] ?? FIELD_META[SETTING_TYPE.TEXT];
                    const current = value?.[field] ?? (type === SETTING_TYPE.FILE ? null : '');
                    const filled = current !== null && current !== '';

                    const common = {
                        value: current ?? '',
                        onChange: (val) => handleChange(field, val),
                        placeholder: config.title,
                        fullWidth: true,
                    };

                    return (
                        <Box key={field}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                                <Icon color={filled ? 'primary' : 'action'} fontSize="small" />
                                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                    {config.title || field}
                                </Typography>
                                <Chip label={label} size="small" variant="outlined" sx={{ height: 20, fontSize: '.7rem' }} />
                                {!filled && (
                                    <Chip
                                        label="Пусто"
                                        size="small"
                                        color="warning"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '.7rem' }}
                                    />
                                )}
                            </Stack>

                            {type === SETTING_TYPE.TEXTAREA && <TextareaInput {...common} rows={3} />}
                            {type === SETTING_TYPE.EDITOR && <EditorInput {...common} />}
                            {type === SETTING_TYPE.FILE && (
                                <FileInput
                                    setting={setting}
                                    value={current}
                                    onChange={(val) => handleChange(field, val)}
                                    hint=""
                                />
                            )}
                            {type === SETTING_TYPE.TEXT && <TextFieldInput {...common} />}
                        </Box>
                    );
                })}
            </Stack>
        </Box>
    );
}

export default memo(DataFields);

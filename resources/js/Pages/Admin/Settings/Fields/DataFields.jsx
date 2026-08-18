import React, { memo, useCallback, useMemo } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import {
    AttachFile as AttachFileIcon,
    Edit as EditIcon,
    Subject as SubjectIcon,
    TextFields as TextFieldsIcon,
    ToggleOn as ToggleOnIcon,
} from '@mui/icons-material';

import TextFieldInput from './TextFieldInput';
import TextareaInput from './TextareaInput';
import EditorInput from './EditorInput';
import FileInput from './FileInput';
import BooleanInput from './BooleanInput';
import { SETTING_TYPE, toBool } from '../utils/uploads';
import { sortFields } from '../utils/fields';

/** Иконки и подписи типов под-полей. */
const FIELD_META = {
    [SETTING_TYPE.TEXT]: { Icon: TextFieldsIcon, label: 'Текст' },
    [SETTING_TYPE.TEXTAREA]: { Icon: SubjectIcon, label: 'Текстовая область' },
    [SETTING_TYPE.EDITOR]: { Icon: EditIcon, label: 'Редактор' },
    [SETTING_TYPE.FILE]: { Icon: AttachFileIcon, label: 'Файл' },
    [SETTING_TYPE.BOOLEAN]: { Icon: ToggleOnIcon, label: 'Флажок' },
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
    // Явный порядок полей из params.fields[key].order.
    const fields = useMemo(() => sortFields(setting.params?.fields), [setting.params?.fields]);

    const handleChange = useCallback(
        (field, val) => onChange({ ...(value ?? {}), [field]: val }),
        [value, onChange],
    );

    if (fields.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    Поля не настроены. Откройте настройку и добавьте их.
                </Typography>
            </Paper>
        );
    }
    return (
        <Box>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Поля данных ({fields.length})
            </Typography>

            <Stack spacing={2.5}>
                {fields.map(([field, config]) => {
                    const type = Number(config.type);
                    const isBool = type === SETTING_TYPE.BOOLEAN;
                    const { Icon, label } = FIELD_META[type] ?? FIELD_META[SETTING_TYPE.TEXT];
                    const current = isBool
                        ? toBool(value?.[field])
                        : value?.[field] ?? (type === SETTING_TYPE.FILE ? null : '');

                    // У флажка выключенное состояние — валидное значение,
                    // поэтому метка «Пусто» к нему не применяется.
                    const filled = isBool ? current : current !== null && current !== '';

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
                                {!filled && !isBool && (
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
                            {isBool && (
                                <BooleanInput
                                    value={current}
                                    onChange={(val) => handleChange(field, val)}
                                    size="small"
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

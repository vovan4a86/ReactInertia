import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Divider,
    CircularProgress,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import FieldRenderer from './Fields/FieldRenderer';

export default function SettingsFields({ settings, onSave }) {
    // Инициализируем values всеми текущими значениями настроек
    const [values, setValues] = useState(() => {
        const initialValues = {};
        settings.forEach(setting => {
            initialValues[setting.id] = setting.value;
        });
        return initialValues;
    });
    const [files, setFiles] = useState({});
    const [saving, setSaving] = useState(false);

    // Обновляем values при изменении settings
    useEffect(() => {
        setValues(prev => {
            const newValues = { ...prev };
            settings.forEach(setting => {
                // Сохраняем существующие значения, если они есть
                if (!(setting.id in newValues) || newValues[setting.id] === undefined) {
                    newValues[setting.id] = setting.value;
                }
            });
            return newValues;
        });
    }, [settings]);

    const handleFieldChange = (settingId, value) => {
        setValues(prev => ({ ...prev, [settingId]: value }));
    };

    const handleFileChange = (key, file) => {
        setFiles(prev => {
            const newFiles = { ...prev };
            if (file) {
                newFiles[key] = file;
            } else {
                delete newFiles[key];
            }
            return newFiles;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const formData = new FormData();

        // Добавляем ВСЕ значения настроек
        Object.entries(values).forEach(([settingId, value]) => {
            if (value === null || value === undefined) {
                formData.append(`settings[${settingId}]`, '');
                return;
            }

            if (Array.isArray(value)) {
                if (value.length === 0) {
                    formData.append(`settings[${settingId}]`, JSON.stringify([]));
                } else {
                    value.forEach((item, index) => {
                        if (typeof item === 'object' && item !== null) {
                            Object.entries(item).forEach(([field, fieldVal]) => {
                                if (fieldVal !== null && fieldVal !== undefined) {
                                    formData.append(
                                        `settings[${settingId}][${index}][${field}]`,
                                        fieldVal
                                    );
                                } else {
                                    formData.append(
                                        `settings[${settingId}][${index}][${field}]`,
                                        ''
                                    );
                                }
                            });
                        } else if (item !== null && item !== undefined) {
                            formData.append(`settings[${settingId}][${index}]`, item);
                        }
                    });
                }
            } else if (typeof value === 'object' && value !== null) {
                const entries = Object.entries(value);
                if (entries.length === 0) {
                    formData.append(`settings[${settingId}]`, JSON.stringify({}));
                } else {
                    entries.forEach(([field, fieldVal]) => {
                        if (fieldVal !== null && fieldVal !== undefined) {
                            formData.append(
                                `settings[${settingId}][${field}]`,
                                fieldVal
                            );
                        } else {
                            formData.append(
                                `settings[${settingId}][${field}]`,
                                ''
                            );
                        }
                    });
                }
            } else {
                // Для редактора передаем HTML как есть
                formData.append(`settings[${settingId}]`, String(value));
            }
        });

        // Add files
        Object.entries(files).forEach(([key, file]) => {
            if (file instanceof File) {
                formData.append(key, file);
            }
        });

        await onSave(formData);
        setSaving(false);
    };

    if (!settings || settings.length === 0) {
        return null;
    }


    return (
        <Box component="form" onSubmit={handleSubmit}>
            {settings.map((setting, index) => (
                <React.Fragment key={setting.id}>
                    <Box sx={{ px: 3, py: 2 }}>
                        {/* Setting Header */}
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            mb: 1.5,
                        }}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={500}>
                                    {setting.name}
                                </Typography>
                                {setting.code && (
                                    <Typography variant="caption" color="textSecondary">
                                        Код: {setting.code}
                                    </Typography>
                                )}
                            </Box>
                            <Button
                                size="small"
                                variant="text"
                                href={`/admin/settings/${setting.id}/edit`}
                                sx={{ ml: 2, flexShrink: 0 }}
                            >
                                редактировать
                            </Button>
                        </Box>

                        {/* Field Renderer */}
                        <Box sx={{ mt: 1 }}>
                            <FieldRenderer
                                setting={setting}
                                value={values[setting.id] !== undefined ? values[setting.id] : setting.value}
                                onChange={(value) => handleFieldChange(setting.id, value)}
                                onFileChange={handleFileChange}
                            />
                        </Box>

                        {/* Description */}
                        {setting.description && (
                            <Typography
                                variant="caption"
                                color="textSecondary"
                                sx={{ mt: 1, display: 'block' }}
                            >
                                {setting.description}
                            </Typography>
                        )}
                    </Box>
                    {index < settings.length - 1 && <Divider />}
                </React.Fragment>
            ))}

            {/* Save Button */}
            <Box sx={{
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'grey.50',
                display: 'flex',
                justifyContent: 'flex-end',
            }}>
                <Button
                    type="submit"
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    size="large"
                    disabled={saving}
                >
                    {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
            </Box>
        </Box>
    );
}

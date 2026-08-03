import React, { useState } from 'react';
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
    const [values, setValues] = useState({});
    const [files, setFiles] = useState({});
    const [saving, setSaving] = useState(false);

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

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);

        const formData = new FormData();

        // Add all setting values
        Object.entries(values).forEach(([settingId, value]) => {
            if (Array.isArray(value)) {
                // Handle array values (lists, galleries)
                value.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        // Handle nested objects (list data)
                        Object.entries(item).forEach(([field, fieldVal]) => {
                            if (fieldVal !== null && fieldVal !== undefined) {
                                formData.append(
                                    `settings[${settingId}][${field}][${index}]`,
                                    fieldVal
                                );
                            }
                        });
                    } else if (item !== null && item !== undefined) {
                        // Handle simple arrays (simple list)
                        formData.append(`settings[${settingId}][${index}]`, item);
                    }
                });
            } else if (typeof value === 'object' && value !== null) {
                // Handle object values (data type)
                Object.entries(value).forEach(([field, fieldVal]) => {
                    if (fieldVal !== null && fieldVal !== undefined) {
                        formData.append(
                            `settings[${settingId}][${field}]`,
                            fieldVal
                        );
                    }
                });
            } else if (value !== null && value !== undefined) {
                // Handle simple values (text, textarea, editor)
                formData.append(`settings[${settingId}]`, value);
            }
        });

        // Add files
        Object.entries(files).forEach(([key, file]) => {
            formData.append(key, file);
        });

        onSave(formData);
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

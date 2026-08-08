import React, {useState, useEffect} from 'react';
import {router} from '@inertiajs/react';
import {
    Box,
    Button,
    Typography,
    Divider,
    CircularProgress,
    IconButton,
} from '@mui/material';
import {Save as SaveIcon, Edit as EditIcon, Delete as DeleteIcon} from '@mui/icons-material';
import FieldRenderer from './Fields/FieldRenderer';
import {useModal} from "@/Contexts/Admin/ModalContext.jsx";
import {useDialog} from '@/Contexts/Admin/DialogContext.jsx';

export default function SettingsFields({settings, onSave}) {
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

    const {openModal} = useModal();
    const {confirm} = useDialog();

    // Обновляем values при изменении settings
    useEffect(() => {
        setValues(prev => {
            const newValues = {...prev};
            settings.forEach(setting => {
                // Сохраняем существующие значения, если они есть
                if (!(setting.id in newValues) || newValues[setting.id] === undefined) {
                    newValues[setting.id] = setting.value;
                }
            });
            return newValues;
        });
    }, [settings]);

    const handleEditSettings = (settingId) => {
        const url = route('admin.settings.edit', {id: settingId});
        openModal(url);
    };

    const handleDeleteSetting = async (settingId) => {
        // Используем кастомный диалог
        // confirm() возвращает Promise
        // Без await переменная result получает сам объект Promise (который всегда truthy)
        const result = await confirm({
            title: 'Удаление настройки',
            message: 'Удалить настройку и все значения? Это действие нельзя отменить.',
            confirmText: 'Удалить',
            cancelText: 'Отмена',
            confirmColor: 'error',
        });

        if (!result) return;

        const url = route('admin.settings.setting.delete', {id: settingId});

        router.delete(url, {
            onSuccess: () => {
                //
            },
            onError: (errors) => {
                //console.error(errors);
            },
        });

    }

    const handleFieldChange = (settingId, value) => {
        setValues(prev => {
            return {...prev, [settingId]: value};
        });
    };

    const handleFileChange = (key, file) => {
        setFiles(prev => {
            const newFiles = {...prev};
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

        // Правильный способ логирования FormData
        console.log('Current values:', values);
        console.log('Current files:', files);

        const formData = new FormData();

        console.log('FormData entries before send:');
        for (let [key, val] of formData.entries()) {
            console.log(key, val);
        }

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
                    // Проверяем, содержит ли массив File объекты (галерея)
                    const hasFiles = value.some(item => item instanceof File);

                    if (hasFiles) {
                        // Для галереи: НЕ отправляем значение массива, только файлы
                        // Laravel сам поймет структуру по файлам
                        value.forEach((item, index) => {
                            if (item instanceof File) {
                                // Файл будет добавлен ниже в секции files
                            } else if (typeof item === 'string') {
                                // Существующий путь к файлу
                                formData.append(`settings[${settingId}][${index}]`, item);
                            }
                        });
                    } else {
                        // Для обычных массивов без файлов
                        const isArrayOfObjects = value.every(item => typeof item === 'object' && item !== null);

                        value.forEach((item, index) => {
                            if (isArrayOfObjects) {
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
                            } else if (typeof item === 'object' && item !== null) {
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
                }
            } else if (typeof value === 'object' && value !== null) {
                // БЛОК для обработки обычных объектов (type 4 DataFields)
                Object.entries(value).forEach(([field, fieldVal]) => {
                    // Проверяем, не является ли значение файлом (хотя файлы должны быть в files)
                    if (fieldVal instanceof File) {
                        // Не добавляем файлы как значения, они будут в files
                        return;
                    }

                    if (fieldVal !== null && fieldVal !== undefined) {
                        formData.append(`settings[${settingId}][${field}]`, fieldVal);
                    } else {
                        formData.append(`settings[${settingId}][${field}]`, '');
                    }
                });
            } else {
                formData.append(`settings[${settingId}]`, value);
            }
        });

        // Добавляем файлы
        console.log('Processing files:', Object.keys(files));
        Object.entries(files).forEach(([key, file]) => {
            if (file instanceof File) {
                console.log(`Adding file: key=${key}, name=${file.name}, size=${file.size}`);
                let formKey = key;
                if (key.includes('.')) {
                    const parts = key.split('.');
                    formKey = parts[0] + '[' + parts.slice(1).join('][') + ']';
                    console.log(`Converted key: ${key} -> ${formKey}`);
                }
                formData.append(formKey, file);
            }
        });

        // Итоговая отладка
        console.log('=== ИТОГОВЫЙ FormData ===');
        let hasEntries = false;
        for (let [key, val] of formData.entries()) {
            hasEntries = true;
            if (val instanceof File) {
                console.log(`${key}: File(${val.name}, ${val.size} bytes)`);
            } else {
                console.log(`${key}: ${val}`);
            }
        }
        if (!hasEntries) {
            console.log('FormData ПУСТОЙ!');
        }


        await onSave(formData);
        setSaving(false);

        // После сохранения очищаем files
        setFiles({});
    };

    if (!settings || settings.length === 0) {
        return null;
    }

    return (
        <Box component="form" onSubmit={handleSubmit}>
            {settings.map((setting, index) => (
                <React.Fragment key={setting.id}>
                    <Box sx={{px: 3, py: 2}}>
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
                            <Box>
                                <IconButton
                                    size="small"
                                    onClick={() => handleEditSettings(setting.id)}
                                    sx={{ml: 2, flexShrink: 0}}
                                >
                                    <EditIcon fontSize="small"/>
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => handleDeleteSetting(setting.id)}
                                    sx={{
                                        color: 'error.main',
                                        '&:hover': {bgcolor: 'error.lighter'},
                                    }}
                                >
                                    <DeleteIcon fontSize="small"/>
                                </IconButton>
                            </Box>
                        </Box>

                        {/* Field Renderer */}
                        <Box sx={{mt: 1}}>
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
                                sx={{mt: 1, display: 'block'}}
                            >
                                {setting.description}
                            </Typography>
                        )}
                    </Box>
                    {index < settings.length - 1 && <Divider/>}
                </React.Fragment>
            ))}

            {/* Save Button */}
            <Box sx={{
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'flex-end',
            }}>
                <Button
                    type="submit"
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={20} color="inherit"/> : <SaveIcon/>}
                    size="large"
                    disabled={saving}
                >
                    {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
            </Box>
        </Box>
    );
}

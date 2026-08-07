import React, { useMemo } from 'react';
import TextFieldInput from './TextFieldInput';
import TextareaInput from './TextareaInput';
import EditorInput from './EditorInput';
import FileInput from './FileInput';
import DataFields from './DataFields';
import ListInput from './ListInput';
import ListDataInput from './ListDataInput';
import GalleryInput from './GalleryInput';

export default function FieldRenderer({ setting, value, onChange, onFileChange }) {
    // Правильный формат имени для файлов: settings.{setting.id}
    const fieldName = `settings[${setting.id}]`;

    // Helper to get file URL from various formats
    const getFileUrl = (fileValue, fileUrls, fieldKey, rowIndex) => {
        if (!fileValue) return null;
        // Direct file URL for type 3
        if (setting.type === 3 && setting.file_url) {
            return setting.file_url;
        }

        // Для типа 6 - работаем с локальными fileUrls
        if (setting.type === 6 && rowIndex !== undefined && fileUrls) {
            // Проверяем fileUrls по индексу и полю
            if (fileUrls[rowIndex] && fileUrls[rowIndex][fieldKey]) {
                return fileUrls[rowIndex][fieldKey];
            }

            // Дополнительная проверка: ищем URL по значению файла
            for (const [index, fields] of Object.entries(fileUrls)) {
                if (fields && fields[fieldKey] &&
                    setting.file_urls &&
                    setting.file_urls[index] &&
                    setting.file_urls[index][fieldKey]) {
                    // Нашли совпадение, возвращаем URL
                    return setting.file_urls[index][fieldKey];
                }
            }
        }

        // Nested file URL from file_urls (для типа 4 - DataFields)
        if (setting.type === 4 && fileUrls && fieldKey && !Array.isArray(fileUrls)) {
            return fileUrls[fieldKey] || null;
        }

        return null;
    };

    // Конфигурация миниатюр
    const thumbsConfig = useMemo(() => {
        return setting?.thumbs_config || [];
    }, [setting?.thumbs_config]);

    // Получаем данные о миниатюрах из gallery_with_thumbs
    const thumbsData = useMemo(() => {
        if (!setting?.thumbs_data) {
            return {};
        }

        // Преобразуем thumbs_data в формат, ожидаемый GalleryInput
        const data = {};
        Object.entries(setting.thumbs_data).forEach(([path, info]) => {
            if (info.thumbs && Object.keys(info.thumbs).length > 0) {
                data[path] = info.thumbs;
            }
        });

        return data;
    }, [setting?.thumbs_data]);

    switch (setting.type) {
        case 0:
            return (
                <TextFieldInput
                    name={fieldName}
                    value={value || ''}
                    onChange={onChange}
                />
            );

        case 1:
            return (
                <TextareaInput
                    name={fieldName}
                    value={value || ''}
                    onChange={onChange}
                />
            );

        case 2:
            return (
                <EditorInput
                    name={fieldName}
                    value={value || ''}
                    onChange={onChange}
                />
            );

        case 3:
            return (
                <FileInput
                    name={fieldName}
                    value={value}
                    fileUrl={setting.file_url}
                    onChange={onChange}
                    onFileChange={onFileChange}
                />
            );

        case 4:
            return (
                <DataFields
                    setting={setting}
                    name={fieldName}
                    value={typeof value === 'object' && value !== null ? value : {}}
                    onChange={onChange}
                    onFileChange={(key, file) => {
                        // Прокидываем файл наверх как есть
                        onFileChange(key, file);
                    }}
                    getFileUrl={getFileUrl}
                />
            );

        case 5:
            return (
                <ListInput
                    name={fieldName}
                    value={Array.isArray(value) ? value : []}
                    onChange={onChange}
                />
            );

        case 6:
            return (
                <ListDataInput
                    setting={setting}
                    name={fieldName}
                    value={Array.isArray(value) ? value : []}
                    onChange={onChange}
                    onFileChange={onFileChange}
                    getFileUrl={getFileUrl}
                    fileUrls={setting.file_urls || {}}
                />
            );

        case 7:
            return (
                <GalleryInput
                    name={fieldName}
                    value={Array.isArray(value) ? value : []}
                    onChange={onChange}
                    onFileChange={onFileChange}
                    fileUrls={setting.file_urls || []}
                    thumbsData={thumbsData}      // Передаем данные о миниатюрах
                    thumbsConfig={thumbsConfig}  // Передаем конфигурацию миниатюр
                />
            );

        default:
            return (
                <TextFieldInput
                    name={fieldName}
                    value={value || ''}
                    onChange={onChange}
                />
            );
    }
}

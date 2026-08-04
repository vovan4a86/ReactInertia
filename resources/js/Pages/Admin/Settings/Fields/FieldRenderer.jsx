import React from 'react';
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
    const getFileUrl = (fileValue, fileUrls, fieldKey) => {
        if (!fileValue) return null;

        // Direct file URL for type 3
        if (setting.type === 3 && setting.file_url) {
            return setting.file_url;
        }

        // Nested file URL from file_urls (для типа 4 - DataFields)
        if (fileUrls && fieldKey && !Array.isArray(fileUrls)) {
            return fileUrls[fieldKey] || fileUrls[fileValue] || null;
        }

        return null;
    };

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
                    value={value || {}}
                    onChange={onChange}
                    onFileChange={onFileChange}
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

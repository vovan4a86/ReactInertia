import React, { useRef, useState } from 'react';
import {
    Box,
    Button,
    IconButton,
    Typography,
    Card,
    CardMedia,
    Link,
} from '@mui/material';
import {
    Upload as UploadIcon,
    Delete as DeleteIcon,
    InsertDriveFile as FileIcon,
    OpenInNew as OpenIcon,
} from '@mui/icons-material';

export default function FileInput({
                                      name,
                                      value,
                                      fileUrl,
                                      onChange,
                                      onFileChange,
                                      placeholder
                                  }) {
    const fileInputRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const [selectedFileName, setSelectedFileName] = useState(null);

    const isImage = (filename) => {
        if (!filename) return false;
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        return imageExtensions.includes(ext);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result);
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }

        // Используем правильный формат имени для бэкенда
        const uploadKey = name; // settings.{setting.id}
        onFileChange(uploadKey, file);
        onChange(uploadKey); // Передаем ключ как значение, чтобы бэкенд знал что это файл
    };


    const handleClear = () => {
        onChange(null);
        onFileChange(name, null);
        setPreview(null);
        setSelectedFileName(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Определяем, есть ли существующий файл (реальное значение, а не маркер)
    const hasExistingFile = value &&
        typeof value === 'string' &&
        !value.startsWith('settings.') &&
        value !== '';
    const hasNewFile = preview !== null;

    // URL для отображения: сначала preview нового файла, потом существующий fileUrl
    const displayUrl = preview || (hasExistingFile ? fileUrl : null);

    // Имя файла для отображения
    const displayFileName = selectedFileName || (hasExistingFile ? value : null);

    // Определяем, является ли файл изображением
    const isDisplayImage = preview ? true : (hasExistingFile && fileUrl ? isImage(fileUrl) : false);

    return (
        <Box>
            <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={handleFileSelect}
                accept="*/*"
            />

            {/* File Preview для изображений */}
            {displayUrl && isDisplayImage && (
                <Card sx={{ mb: 1.5, maxWidth: 300 }} variant="outlined">
                    <CardMedia
                        component="img"
                        height="200"
                        image={displayUrl}
                        alt="Preview"
                        sx={{ objectFit: 'cover' }}
                    />
                </Card>
            )}

            {/* File Link для не-изображений */}
            {hasExistingFile && !isDisplayImage && (
                <Box sx={{
                    mb: 1.5,
                    p: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    maxWidth: 400,
                }}>
                    <FileIcon color="action" />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap title={displayFileName}>
                            {displayFileName}
                        </Typography>
                    </Box>
                    {fileUrl && (
                        <IconButton
                            size="small"
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <OpenIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            )}

            {/* Информация о новом не-изображении файле */}
            {hasNewFile && !preview && (
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Выбран файл: {selectedFileName}
                </Typography>
            )}

            {/* Controls */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {placeholder || 'Выбрать файл'}
                </Button>

                {(hasExistingFile || hasNewFile) && (
                    <IconButton
                        size="small"
                        color="error"
                        onClick={handleClear}
                        title="Удалить файл"
                    >
                        <DeleteIcon />
                    </IconButton>
                )}
            </Box>

            {/* Supported formats hint */}
            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                Поддерживаются изображения и документы
            </Typography>
        </Box>
    );
}

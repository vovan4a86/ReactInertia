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

        const uploadKey = `setting_file_${name}`;
        onFileChange(uploadKey, file);
        onChange(uploadKey);
    };

    const handleClear = () => {
        onChange(null);
        onFileChange(name, null);
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const displayUrl = preview || fileUrl;
    const hasValue = value && !value.startsWith('setting_file_');
    const currentFileName = hasValue ? value : '';

    return (
        <Box>
            <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={handleFileSelect}
                accept="*/*"
            />

            {/* File Preview */}
            {displayUrl && isImage(currentFileName || preview) && (
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

            {/* File Link */}
            {hasValue && fileUrl && !isImage(currentFileName) && (
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
                        <Typography variant="body2" noWrap title={value}>
                            {value}
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

            {/* File Name (new upload) */}
            {preview && !isImage(currentFileName) && (
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Выбран файл: {value}
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

                {hasValue && (
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

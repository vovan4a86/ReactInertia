import React, { useRef } from 'react';
import {
    Box,
    IconButton,
    Card,
    CardMedia,
    CardActions,
    Button,
    Grid,
    Typography,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Add as AddIcon,
    CloudUpload as UploadIcon,
} from '@mui/icons-material';

export default function GalleryInput({
                                         name,
                                         value = [],
                                         onChange,
                                         onFileChange,
                                         fileUrls = [],
                                     }) {
    const fileInputRef = useRef(null);

    const handleAddFiles = (e) => {
        const files = Array.from(e.target.files);
        const newValues = [...value];

        files.forEach((file) => {
            const uploadKey = `setting_file_${name}_${Date.now()}_${Math.random()}`;
            onFileChange(uploadKey, file);
            newValues.push(uploadKey);
        });

        onChange(newValues);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemove = (index) => {
        const newValues = value.filter((_, i) => i !== index);
        onChange(newValues);
    };

    const handleMove = (index, direction) => {
        const newValues = [...value];
        const newIndex = index + direction;

        if (newIndex < 0 || newIndex >= newValues.length) return;

        [newValues[index], newValues[newIndex]] = [newValues[newIndex], newValues[index]];
        onChange(newValues);
    };

    const getFileUrl = (item) => {
        if (typeof item === 'string' && item.startsWith('setting_file_')) {
            return null; // Новый файл, еще не загружен
        }
        const index = value.indexOf(item);
        return fileUrls[index] || null;
    };

    const getFileName = (item) => {
        if (typeof item === 'string' && item.startsWith('setting_file_')) {
            return 'Новый файл';
        }
        return item || 'Файл';
    };

    return (
        <Box>
            <input
                ref={fileInputRef}
                type="file"
                hidden
                multiple
                accept="image/*"
                onChange={handleAddFiles}
            />

            <Grid container spacing={2}>
                {value.map((item, index) => {
                    const url = getFileUrl(item);

                    return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                            <Card variant="outlined">
                                {url ? (
                                    <CardMedia
                                        component="img"
                                        height="150"
                                        image={url}
                                        alt={`Image ${index + 1}`}
                                        sx={{ objectFit: 'cover' }}
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            height: 150,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: 'grey.100',
                                        }}
                                    >
                                        <UploadIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                                    </Box>
                                )}

                                <CardActions sx={{ justifyContent: 'space-between', px: 1 }}>
                                    <Box>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleMove(index, -1)}
                                            disabled={index === 0}
                                            title="Переместить влево"
                                        >
                                            ←
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleMove(index, 1)}
                                            disabled={index === value.length - 1}
                                            title="Переместить вправо"
                                        >
                                            →
                                        </IconButton>
                                    </Box>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleRemove(index)}
                                        title="Удалить изображение"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </CardActions>

                                <Box sx={{ px: 1, pb: 1 }}>
                                    <Typography
                                        variant="caption"
                                        color="textSecondary"
                                        noWrap
                                        title={getFileName(item)}
                                    >
                                        {index + 1}. {getFileName(item)}
                                    </Typography>
                                </Box>
                            </Card>
                        </Grid>
                    );
                })}

                <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Card
                        variant="outlined"
                        sx={{
                            height: '100%',
                            minHeight: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            borderStyle: 'dashed',
                            '&:hover': {
                                bgcolor: 'action.hover',
                                borderColor: 'primary.main',
                            },
                        }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                            <AddIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="body2" color="textSecondary">
                                Добавить изображения
                            </Typography>
                        </Box>
                    </Card>
                </Grid>
            </Grid>

            {value.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                        Нет изображений
                    </Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<UploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Загрузить изображения
                    </Button>
                </Box>
            )}
        </Box>
    );
}

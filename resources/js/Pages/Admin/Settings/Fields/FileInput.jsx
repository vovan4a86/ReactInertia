import React, { memo, useRef } from 'react';
import {
    Box,
    Button,
    Card,
    CardMedia,
    IconButton,
    Link,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    InsertDriveFile as FileIcon,
    OpenInNew as OpenIcon,
    Upload as UploadIcon,
} from '@mui/icons-material';
import { useSettingsForm } from '../SettingsFormContext';
import { formatBytes, isImagePath, isUploadMarker } from '../utils/uploads';

/**
 * Универсальное поле загрузки одного файла.
 *
 * Используется и как самостоятельный тип (3), и внутри DataFields / ListDataInput.
 * Значение поля — либо имя сохранённого файла, либо маркер `@upload:<token>`,
 * либо null (файл очищен).
 *
 * @param {object}   props
 * @param {object}   props.setting  настройка-владелец (нужна карта file_urls)
 * @param {string|null} props.value текущее значение
 * @param {(value: string|null) => void} props.onChange
 * @param {string}   [props.accept] фильтр диалога выбора файла
 * @param {string}   [props.label]  подпись кнопки
 * @param {string}   [props.hint]   подсказка под полем
 */
function FileInput({
                       setting,
                       value,
                       onChange,
                       accept = '*/*',
                       label = 'Выбрать файл',
                       hint = 'Изображения и документы',
                                  }) {
    const inputRef = useRef(null);
    const { registerUpload, releaseUpload, resolveFileUrl, resolveFileName, getUpload } = useSettingsForm();

    const upload = getUpload(value);
    const url = resolveFileUrl(setting, value);
    const fileName = resolveFileName(value);
    const isPending = isUploadMarker(value);
    const hasValue = Boolean(value);
    const isImage = isPending ? Boolean(upload?.previewUrl) : isImagePath(fileName ?? url);

    /** Выбор нового файла: старый маркер освобождаем, чтобы не копить objectURL. */
    const handleSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (isUploadMarker(value)) {
            releaseUpload(value);
        }

        onChange(registerUpload(file));

        // Позволяет выбрать тот же файл повторно
        event.target.value = '';
    };

    /** Очистка: сервер удалит файл при сохранении. */
    const handleClear = () => {
        if (isUploadMarker(value)) {
            releaseUpload(value);
        }

        onChange(null);

        if (inputRef.current) inputRef.current.value = '';
    };


    return (
        <Box>
            <input ref={inputRef} type="file" hidden accept={accept} onChange={handleSelect} />

            {/* Превью изображения */}
            {hasValue && isImage && url && (
                <Card variant="outlined" sx={{ mb: 1.5, maxWidth: 280 }}>
                    <CardMedia
                        component="img"
                        image={url}
                        alt={fileName ?? 'preview'}
                        sx={{ height: 180, objectFit: 'cover' }}
                    />
                </Card>
            )}

            {/* Не-изображение */}
            {hasValue && !isImage && (
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                        mb: 1.5,
                        p: 1,
                        maxWidth: 420,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                    }}
                >
                    <FileIcon color="action" fontSize="small" />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap title={fileName ?? ''}>
                            {fileName}
                        </Typography>
                        {upload?.file && (
                            <Typography variant="caption" color="text.secondary">
                                {formatBytes(upload.file.size)}
                            </Typography>
                        )}
                    </Box>
                    {url && !isPending && (
                        <Tooltip title="Открыть файл">
                            <IconButton size="small" component={Link} href={url} target="_blank" rel="noopener">
                                <OpenIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            )}

            <Stack direction="row" spacing={1} alignItems="center">
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UploadIcon />}
                    onClick={() => inputRef.current?.click()}
                >
                    {hasValue ? 'Заменить' : label}
                </Button>

                {hasValue && (
                    <Tooltip title="Удалить файл">
                        <IconButton size="small" color="error" onClick={handleClear}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}

                {isPending && (
                    <Typography variant="caption" color="warning.main">
                        Будет загружен при сохранении
                    </Typography>
                )}
            </Stack>

            {hint && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {hint}
                </Typography>
            )}
        </Box>
    );
}

export default memo(FileInput);

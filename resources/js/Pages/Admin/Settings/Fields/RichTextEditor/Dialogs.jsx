import { memo, useEffect, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { isSafeUrl, sanitizeUrl } from './urls';

/**
 * Диалог вставки/редактирования ссылки.
 *
 * Исправлено против прежней версии:
 *  - была мёртвая ветка `if (linkUrl) { if (linkUrl === '') {…unsetLink} }`,
 *    из-за которой ссылку нельзя было снять, очистив поле;
 *  - отсутствовала валидация — принимался `javascript:alert(1)`;
 *  - `onKeyPress` устарел, в React 19 используем `onKeyDown`.
 *
 * @param {object}  props
 * @param {boolean} props.open
 * @param {string}  props.initialUrl        текущий href (для режима правки)
 * @param {boolean} props.isEditing         ссылка уже стоит на выделении
 * @param {(url: string) => void} props.onSubmit  получает нормализованный URL
 * @param {() => void} props.onRemove
 * @param {() => void} props.onClose
 */
export const LinkDialog = memo(function LinkDialog({
    open,
    initialUrl = '',
    isEditing = false,
    onSubmit,
    onRemove,
    onClose,
}) {
    const [url, setUrl] = useState(initialUrl);
    const [touched, setTouched] = useState(false);

    // Подтягиваем актуальный href при каждом открытии.
    useEffect(() => {
        if (open) {
            setUrl(initialUrl);
            setTouched(false);
        }
    }, [open, initialUrl]);

    const trimmed = url.trim();
    const invalid = touched && trimmed !== '' && !isSafeUrl(trimmed);

    const submit = () => {
        const safe = sanitizeUrl(trimmed);

        if (trimmed === '') {
            // Пустое поле = снять ссылку. Раньше этот сценарий был недостижим.
            onRemove();
            return;
        }

        if (!safe) {
            setTouched(true);
            return;
        }

        onSubmit(safe);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEditing ? 'Редактировать ссылку' : 'Вставить ссылку'}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    margin="dense"
                    label="URL"
                    variant="outlined"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    onBlur={() => setTouched(true)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            submit();
                        }
                    }}
                    placeholder="https://example.com"
                    error={invalid}
                    helperText={
                        invalid
                            ? 'Допустимы только http, https, mailto, tel и относительные пути'
                            : 'Пустое поле удалит ссылку'
                    }
                />
            </DialogContent>
            <DialogActions>
                {isEditing && (
                    <Button color="error" onClick={onRemove}>
                        Удалить ссылку
                    </Button>
                )}
                <Button onClick={onClose}>Отмена</Button>
                <Button variant="contained" onClick={submit}>
                    {isEditing ? 'Обновить' : 'Вставить'}
                </Button>
            </DialogActions>
        </Dialog>
    );
});

/**
 * Диалог вставки изображения по URL.
 *
 * @param {object}  props
 * @param {boolean} props.open
 * @param {boolean} [props.allowBase64=false]
 * @param {(url: string) => void} props.onSubmit
 * @param {() => void} props.onClose
 */
export const ImageDialog = memo(function ImageDialog({
    open,
    allowBase64 = false,
    onSubmit,
    onClose,
}) {
    const [url, setUrl] = useState('');
    const [alt, setAlt] = useState('');
    const [touched, setTouched] = useState(false);

    useEffect(() => {
        if (open) {
            setUrl('');
            setAlt('');
            setTouched(false);
        }
    }, [open]);

    const trimmed = url.trim();
    const safe = sanitizeUrl(trimmed, { allowData: allowBase64 });
    const invalid = touched && trimmed !== '' && !safe;

    const submit = () => {
        if (!safe) {
            setTouched(true);
            return;
        }

        onSubmit(safe, alt.trim());
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Вставить изображение</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    margin="dense"
                    label="URL изображения"
                    variant="outlined"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    onBlur={() => setTouched(true)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            submit();
                        }
                    }}
                    placeholder="https://example.com/image.jpg"
                    error={invalid}
                    helperText={invalid ? 'Недопустимый адрес изображения' : ' '}
                />
                <TextField
                    fullWidth
                    margin="dense"
                    label="Описание (alt)"
                    variant="outlined"
                    value={alt}
                    onChange={(event) => setAlt(event.target.value)}
                />
                {safe && (
                    <Box
                        component="img"
                        src={safe}
                        alt=""
                        sx={{
                            mt: 1.5,
                            maxHeight: 160,
                            maxWidth: '100%',
                            borderRadius: 1,
                            border: 1,
                            borderColor: 'divider',
                            objectFit: 'contain',
                            display: 'block',
                        }}
                    />
                )}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Вставьте прямую ссылку на изображение
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Отмена</Button>
                <Button variant="contained" onClick={submit} disabled={!safe}>
                    Вставить
                </Button>
            </DialogActions>
        </Dialog>
    );
});

/**
 * Палитра выбора цвета текста.
 *
 * @param {Array<{name: string, value: string}>} props.colors
 * @param {string|null} props.current            активный цвет из mark `textStyle`
 * @param {(color: string|null) => void} props.onSelect  null = сбросить цвет
 */
export const ColorPalette = memo(function ColorPalette({ colors, current, onSelect }) {
    return (
        <Box sx={{ p: 1.5, display: 'flex', gap: 0.75, flexWrap: 'wrap', maxWidth: 232 }}>
            <Tooltip title="Убрать цвет" disableInteractive>
                <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(null)}
                    sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        border: 2,
                        borderColor: 'text.primary',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                        lineHeight: 1,
                    }}
                >
                    /
                </Box>
            </Tooltip>

            {colors.map((color) => (
                <Tooltip key={color.value} title={color.name} disableInteractive>
                    <Box
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect(color.value)}
                        sx={{
                            width: 28,
                            height: 28,
                            borderRadius: 1,
                            bgcolor: color.value,
                            cursor: 'pointer',
                            border: 2,
                            borderColor:
                                current?.toLowerCase() === color.value.toLowerCase()
                                    ? 'primary.main'
                                    : 'divider',
                            transition: 'transform .15s',
                            '&:hover': { transform: 'scale(1.12)' },
                        }}
                    />
                </Tooltip>
            ))}
        </Box>
    );
});

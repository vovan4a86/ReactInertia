import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import {Table} from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import CodeBlock from '@tiptap/extension-code-block';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {TextStyle} from '@tiptap/extension-text-style';
import {
    Box,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Divider,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    Typography,
    Popover,
    useTheme
} from '@mui/material';
import {
    FormatBold,
    FormatItalic,
    FormatUnderlined,
    FormatStrikethrough,
    FormatListBulleted,
    FormatListNumbered,
    FormatQuote,
    Code,
    FormatAlignLeft,
    FormatAlignCenter,
    FormatAlignRight,
    FormatAlignJustify,
    HorizontalRule,
    Undo,
    Redo,
    Image as ImageIcon,
    Link as LinkIcon,
    TableChart,
    FormatColorText,
    Highlight as HighlightIcon,
    CheckBox,
    Title,
    Code as CodeBlockIcon,
    FormatClear
} from '@mui/icons-material';
import { useState } from 'react';

// Предопределенные цвета
const COLORS = [
    { name: 'Черный', value: '#000000' },
    { name: 'Красный', value: '#FF0000' },
    { name: 'Зеленый', value: '#00FF00' },
    { name: 'Синий', value: '#0000FF' },
    { name: 'Желтый', value: '#FFFF00' },
    { name: 'Фиолетовый', value: '#800080' },
    { name: 'Оранжевый', value: '#FFA500' },
    { name: 'Серый', value: '#808080' },
    { name: 'Белый', value: '#FFFFFF' },
];

const RichTextEditor = ({ value, onChange, placeholder = 'Введите текст...' }) => {
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';

    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [colorAnchorEl, setColorAnchorEl] = useState(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3, 4],
                },
            }),
            Placeholder.configure({
                placeholder: placeholder,
            }),
            TextStyle,
            Color,
            Image.configure({
                inline: false,
                allowBase64: true,
            }),
            Link.configure({
                openOnClick: true,
                HTMLAttributes: {
                    rel: 'noopener noreferrer',
                    target: '_blank',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Underline,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableCell,
            TableHeader,
            Highlight.configure({
                multicolor: true,
            }),
            CodeBlock,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
        ],
        content: value || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange(html);
        },
        editorProps: {
            attributes: {
                class: 'prose-editor',
            },
        },
    });

    if (!editor) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="textSecondary">Загрузка редактора...</Typography>
            </Box>
        );
    }

    const addImage = () => {
        if (imageUrl) {
            editor.chain().focus().setImage({ src: imageUrl }).run();
            setImageUrl('');
            setImageDialogOpen(false);
        }
    };

    const setLink = () => {
        if (linkUrl) {
            if (linkUrl === '') {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
            } else {
                editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
            }
        }
        setLinkUrl('');
        setLinkDialogOpen(false);
    };

    const openLinkDialog = () => {
        const previousUrl = editor.getAttributes('link').href;
        setLinkUrl(previousUrl || '');
        setLinkDialogOpen(true);
    };

    const addTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };

    const setColor = (color) => {
        if (color === 'default') {
            editor.chain().focus().unsetColor().run();
        } else {
            editor.chain().focus().setColor(color).run();
        }
        setColorAnchorEl(null);
    };

    // Вспомогательные функции для заголовков
    const getHeadingLevel = () => {
        if (editor.isActive('heading', { level: 1 })) return 'h1';
        if (editor.isActive('heading', { level: 2 })) return 'h2';
        if (editor.isActive('heading', { level: 3 })) return 'h3';
        if (editor.isActive('heading', { level: 4 })) return 'h4';
        return 'paragraph';
    };

    const setHeading = (value) => {
        if (value === 'paragraph') {
            editor.chain().focus().setParagraph().run();
        } else {
            const level = parseInt(value.replace('h', ''));
            editor.chain().focus().toggleHeading({ level }).run();
        }
    };

    // Стили для тулбара в зависимости от темы
    const toolbarStyles = {
        border: `1px solid ${isDarkMode ? '#424242' : '#e0e0e0'}`,
        borderRadius: '4px 4px 0 0',
        bgcolor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
        borderBottom: `1px solid ${isDarkMode ? '#424242' : '#e0e0e0'}`,
        p: 0.5,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        alignItems: 'center',
    };

    const editorContainerStyles = {
        border: `1px solid ${isDarkMode ? '#424242' : '#ccc'}`,
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: isDarkMode ? '#1a1a1a' : '#ffffff',
        '&:focus-within': {
            borderColor: 'primary.main',
            boxShadow: `0 0 0 2px ${isDarkMode ? 'rgba(144, 202, 249, 0.2)' : 'rgba(25, 118, 210, 0.2)'}`,
        },
    };

    const editorContentStyles = {
        minHeight: '200px',
        maxHeight: '500px',
        overflowY: 'auto',
        cursor: 'text',
        color: isDarkMode ? '#ffffff' : 'inherit',
        '& .ProseMirror': {
            minHeight: '200px',
            padding: '16px',
            outline: 'none',
            color: isDarkMode ? '#e0e0e0' : '#333333',
            '& p.is-editor-empty:first-of-type::before': {
                content: 'attr(data-placeholder)',
                float: 'left',
                color: isDarkMode ? '#666666' : '#adb5bd',
                pointerEvents: 'none',
                height: 0,
            },
            '& h1, & h2, & h3, & h4, & h5, & h6': {
                color: isDarkMode ? '#ffffff' : '#1a1a1a',
            },
            '& img': {
                maxWidth: '100%',
                height: 'auto',
                '&.ProseMirror-selectednode': {
                    outline: `3px solid ${isDarkMode ? '#90caf9' : '#68CEF8'}`,
                },
            },
            '& a': {
                color: isDarkMode ? '#90caf9' : '#1976d2',
            },
            '& table': {
                borderCollapse: 'collapse',
                margin: 0,
                overflow: 'hidden',
                tableLayout: 'fixed',
                width: '100%',
                '& td, & th': {
                    border: `2px solid ${isDarkMode ? '#424242' : '#ced4da'}`,
                    boxSizing: 'border-box',
                    minWidth: '1em',
                    padding: '3px 5px',
                    position: 'relative',
                    verticalAlign: 'top',
                    color: isDarkMode ? '#e0e0e0' : 'inherit',
                    '& > *': {
                        marginBottom: 0,
                    },
                },
                '& th': {
                    backgroundColor: isDarkMode ? '#2d2d2d' : '#f1f3f5',
                    fontWeight: 'bold',
                    textAlign: 'left',
                },
                '& .selectedCell:after': {
                    background: isDarkMode ? 'rgba(144, 202, 249, 0.2)' : 'rgba(200, 200, 255, 0.4)',
                    content: '""',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                    position: 'absolute',
                    zIndex: 2,
                },
            },
            '& pre': {
                background: isDarkMode ? '#0d0d0d' : '#1a1a1a',
                borderRadius: '0.5rem',
                color: '#ffffff',
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                padding: '0.75rem 1rem',
                '& code': {
                    background: 'none',
                    color: 'inherit',
                    fontSize: '0.8rem',
                    padding: 0,
                },
            },
            '& code': {
                backgroundColor: isDarkMode ? '#2d2d2d' : '#f5f5f5',
                borderRadius: '0.25rem',
                color: isDarkMode ? '#e0e0e0' : '#e83e8c',
                padding: '0.2em 0.4em',
                fontSize: '0.875em',
            },
            '& blockquote': {
                borderLeft: `3px solid ${isDarkMode ? '#424242' : '#ddd'}`,
                paddingLeft: '1rem',
                margin: '1rem 0',
                color: isDarkMode ? '#999999' : '#666666',
            },
            '& hr': {
                border: 'none',
                borderTop: `2px solid ${isDarkMode ? '#424242' : '#ddd'}`,
                margin: '2rem 0',
            },
            '& ul, & ol': {
                paddingLeft: '1.5rem',
            },
            '& ul[data-type="taskList"]': {
                listStyle: 'none',
                padding: 0,
                '& li': {
                    display: 'flex',
                    alignItems: 'flex-start',
                    '& > label': {
                        flex: '0 0 auto',
                        marginRight: '0.5rem',
                        userSelect: 'none',
                    },
                    '& > div': {
                        flex: '1 1 auto',
                    },
                },
            },
            '& mark': {
                backgroundColor: isDarkMode ? '#ffd60033' : '#faf594',
                color: isDarkMode ? '#ffffff' : 'inherit',
                padding: '0.1em 0.2em',
                borderRadius: '0.25rem',
            },
        },
    };

    return (
        <Box sx={editorContainerStyles}>
            {/* Toolbar */}
            <Box sx={toolbarStyles}>
                {/* Undo/Redo */}
                <Tooltip title="Отменить (Ctrl+Z)">
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        sx={{ color: isDarkMode ? '#ffffff' : 'inherit' }}
                    >
                        <Undo fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Повторить (Ctrl+Y)">
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        sx={{ color: isDarkMode ? '#ffffff' : 'inherit' }}
                    >
                        <Redo fontSize="small" />
                    </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: isDarkMode ? '#424242' : '#e0e0e0' }} />

                {/* Форматирование текста */}
                <ToggleButtonGroup size="small" sx={{ mr: 0.5 }}>
                    <ToggleButton
                        value="bold"
                        selected={editor.isActive('bold')}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        sx={{
                            px: 1,
                            color: isDarkMode ? '#ffffff' : 'inherit',
                            '&.Mui-selected': {
                                bgcolor: isDarkMode ? '#424242' : '#e0e0e0',
                            }
                        }}
                    >
                        <FormatBold fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                        value="italic"
                        selected={editor.isActive('italic')}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        sx={{
                            px: 1,
                            color: isDarkMode ? '#ffffff' : 'inherit',
                            '&.Mui-selected': {
                                bgcolor: isDarkMode ? '#424242' : '#e0e0e0',
                            }
                        }}
                    >
                        <FormatItalic fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                        value="underline"
                        selected={editor.isActive('underline')}
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        sx={{
                            px: 1,
                            color: isDarkMode ? '#ffffff' : 'inherit',
                            '&.Mui-selected': {
                                bgcolor: isDarkMode ? '#424242' : '#e0e0e0',
                            }
                        }}
                    >
                        <FormatUnderlined fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                        value="strike"
                        selected={editor.isActive('strike')}
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        sx={{
                            px: 1,
                            color: isDarkMode ? '#ffffff' : 'inherit',
                            '&.Mui-selected': {
                                bgcolor: isDarkMode ? '#424242' : '#e0e0e0',
                            }
                        }}
                    >
                        <FormatStrikethrough fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: isDarkMode ? '#424242' : '#e0e0e0' }} />

                {/* Заголовки */}
                <FormControl size="small" sx={{ minWidth: 130, mr: 0.5 }}>
                    <Select
                        value={getHeadingLevel()}
                        onChange={(e) => setHeading(e.target.value)}
                        displayEmpty
                        sx={{
                            height: 32,
                            color: isDarkMode ? '#ffffff' : 'inherit',
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: isDarkMode ? '#424242' : '#e0e0e0',
                            },
                            '& .MuiSvgIcon-root': {
                                color: isDarkMode ? '#ffffff' : 'inherit',
                            }
                        }}
                    >
                        <MenuItem value="paragraph">Параграф</MenuItem>
                        <MenuItem value="h1">Заголовок 1</MenuItem>
                        <MenuItem value="h2">Заголовок 2</MenuItem>
                        <MenuItem value="h3">Заголовок 3</MenuItem>
                        <MenuItem value="h4">Заголовок 4</MenuItem>
                    </Select>
                </FormControl>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: isDarkMode ? '#424242' : '#e0e0e0' }} />

                {/* Выравнивание */}
                <ToggleButtonGroup size="small" sx={{ mr: 0.5 }}>
                    {[
                        { value: 'left', icon: <FormatAlignLeft fontSize="small" />, title: 'По левому краю' },
                        { value: 'center', icon: <FormatAlignCenter fontSize="small" />, title: 'По центру' },
                        { value: 'right', icon: <FormatAlignRight fontSize="small" />, title: 'По правому краю' },
                        { value: 'justify', icon: <FormatAlignJustify fontSize="small" />, title: 'По ширине' },
                    ].map(({ value, icon, title }) => (
                        <Tooltip key={value} title={title}>
                            <ToggleButton
                                value={value}
                                selected={editor.isActive({ textAlign: value })}
                                onClick={() => editor.chain().focus().setTextAlign(value).run()}
                                sx={{
                                    px: 1,
                                    color: isDarkMode ? '#ffffff' : 'inherit',
                                    '&.Mui-selected': {
                                        bgcolor: isDarkMode ? '#424242' : '#e0e0e0',
                                    }
                                }}
                            >
                                {icon}
                            </ToggleButton>
                        </Tooltip>
                    ))}
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: isDarkMode ? '#424242' : '#e0e0e0' }} />

                {/* Списки */}
                <ToggleButtonGroup size="small" sx={{ mr: 0.5 }}>
                    {[
                        { value: 'bulletList', icon: <FormatListBulleted fontSize="small" />, title: 'Маркированный список' },
                        { value: 'orderedList', icon: <FormatListNumbered fontSize="small" />, title: 'Нумерованный список' },
                        { value: 'taskList', icon: <CheckBox fontSize="small" />, title: 'Список задач' },
                    ].map(({ value, icon, title }) => (
                        <Tooltip key={value} title={title}>
                            <ToggleButton
                                value={value}
                                selected={editor.isActive(value)}
                                onClick={() => editor.chain().focus()[`toggle${value.charAt(0).toUpperCase() + value.slice(1)}`]().run()}
                                sx={{
                                    px: 1,
                                    color: isDarkMode ? '#ffffff' : 'inherit',
                                    '&.Mui-selected': {
                                        bgcolor: isDarkMode ? '#424242' : '#e0e0e0',
                                    }
                                }}
                            >
                                {icon}
                            </ToggleButton>
                        </Tooltip>
                    ))}
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: isDarkMode ? '#424242' : '#e0e0e0' }} />

                {/* Специальные элементы */}
                {[
                    { value: 'blockquote', icon: <FormatQuote fontSize="small" />, title: 'Цитата' },
                    { value: 'code', icon: <Code fontSize="small" />, title: 'Встроенный код' },
                    { value: 'codeBlock', icon: <CodeBlockIcon fontSize="small" />, title: 'Блок кода' },
                ].map(({ value, icon, title }) => (
                    <Tooltip key={value} title={title}>
                        <ToggleButton
                            value={value}
                            selected={editor.isActive(value)}
                            onClick={() => editor.chain().focus()[`toggle${value.charAt(0).toUpperCase() + value.slice(1)}`]().run()}
                            size="small"
                            sx={{
                                px: 1,
                                color: isDarkMode ? '#ffffff' : 'inherit',
                                '&.Mui-selected': {
                                    bgcolor: isDarkMode ? '#424242' : '#e0e0e0',
                                }
                            }}
                        >
                            {icon}
                        </ToggleButton>
                    </Tooltip>
                ))}

                <Tooltip title="Горизонтальная линия">
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        sx={{ color: isDarkMode ? '#ffffff' : 'inherit' }}
                    >
                        <HorizontalRule fontSize="small" />
                    </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: isDarkMode ? '#424242' : '#e0e0e0' }} />

                {/* Цвет и выделение */}
                <Tooltip title="Цвет текста">
                    <IconButton
                        size="small"
                        onClick={(e) => setColorAnchorEl(e.currentTarget)}
                        sx={{
                            color: editor.isActive('color') ? 'primary.main' : (isDarkMode ? '#ffffff' : 'inherit')
                        }}
                    >
                        <FormatColorText fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Выделение текста">
                    <ToggleButton
                        value="highlight"
                        selected={editor.isActive('highlight')}
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        size="small"
                        sx={{
                            px: 1,
                            color: isDarkMode ? '#ffffff' : 'inherit',
                            '&.Mui-selected': {
                                bgcolor: isDarkMode ? '#424242' : '#e0e0e0',
                            }
                        }}
                    >
                        <HighlightIcon fontSize="small" />
                    </ToggleButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: isDarkMode ? '#424242' : '#e0e0e0' }} />

                {/* Вставка элементов */}
                <Tooltip title="Вставить ссылку">
                    <IconButton
                        size="small"
                        onClick={openLinkDialog}
                        sx={{
                            color: editor.isActive('link') ? 'primary.main' : (isDarkMode ? '#ffffff' : 'inherit')
                        }}
                    >
                        <LinkIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Вставить изображение">
                    <IconButton
                        size="small"
                        onClick={() => setImageDialogOpen(true)}
                        sx={{ color: isDarkMode ? '#ffffff' : 'inherit' }}
                    >
                        <ImageIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Вставить таблицу">
                    <IconButton
                        size="small"
                        onClick={addTable}
                        sx={{ color: isDarkMode ? '#ffffff' : 'inherit' }}
                    >
                        <TableChart fontSize="small" />
                    </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: isDarkMode ? '#424242' : '#e0e0e0' }} />

                {/* Очистить форматирование */}
                <Tooltip title="Очистить форматирование">
                    <IconButton
                        size="small"
                        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                        sx={{ color: isDarkMode ? '#ffffff' : 'inherit' }}
                    >
                        <FormatClear fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Цветовая палитра */}
            <Popover
                open={Boolean(colorAnchorEl)}
                anchorEl={colorAnchorEl}
                onClose={() => setColorAnchorEl(null)}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <Box sx={{
                    p: 1.5,
                    display: 'flex',
                    gap: 0.5,
                    flexWrap: 'wrap',
                    maxWidth: 250,
                    bgcolor: isDarkMode ? '#1e1e1e' : '#ffffff',
                }}>
                    <Box
                        onClick={() => setColor('default')}
                        sx={{
                            width: 30,
                            height: 30,
                            border: `2px solid ${isDarkMode ? '#ffffff' : '#000000'}`,
                            borderRadius: 1,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 20,
                            fontWeight: 'bold',
                            color: isDarkMode ? '#ffffff' : '#000000',
                        }}
                    >
                        /
                    </Box>
                    {COLORS.map(color => (
                        <Box
                            key={color.value}
                            onClick={() => setColor(color.value)}
                            sx={{
                                width: 30,
                                height: 30,
                                bgcolor: color.value,
                                border: `1px solid ${isDarkMode ? '#424242' : '#ccc'}`,
                                cursor: 'pointer',
                                borderRadius: 1,
                                transition: 'transform 0.2s',
                                '&:hover': {
                                    transform: 'scale(1.1)',
                                    opacity: 0.9,
                                }
                            }}
                            title={color.name}
                        />
                    ))}
                </Box>
            </Popover>

            {/* Диалог ссылки */}
            <Dialog
                open={linkDialogOpen}
                onClose={() => setLinkDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {editor.isActive('link') ? 'Редактировать ссылку' : 'Вставить ссылку'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="URL"
                        type="url"
                        fullWidth
                        variant="outlined"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                setLink();
                            }
                        }}
                        placeholder="https://example.com"
                    />
                </DialogContent>
                <DialogActions>
                    {editor.isActive('link') && (
                        <Button
                            onClick={() => {
                                editor.chain().focus().unsetLink().run();
                                setLinkDialogOpen(false);
                            }}
                            color="error"
                        >
                            Удалить ссылку
                        </Button>
                    )}
                    <Button onClick={() => setLinkDialogOpen(false)}>Отмена</Button>
                    <Button onClick={setLink} variant="contained">
                        {editor.isActive('link') ? 'Обновить' : 'Вставить'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог изображения */}
            <Dialog
                open={imageDialogOpen}
                onClose={() => setImageDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Вставить изображение</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="URL изображения"
                        type="url"
                        fullWidth
                        variant="outlined"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addImage();
                            }
                        }}
                        placeholder="https://example.com/image.jpg"
                    />
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                        Вставьте прямую ссылку на изображение
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setImageDialogOpen(false)}>Отмена</Button>
                    <Button onClick={addImage} variant="contained">Вставить</Button>
                </DialogActions>
            </Dialog>

            {/* Редактор */}
            <Box sx={editorContentStyles}>
                <EditorContent editor={editor} />
            </Box>
        </Box>
    );
};

export default RichTextEditor;

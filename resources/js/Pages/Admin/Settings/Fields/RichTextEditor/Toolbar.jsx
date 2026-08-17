import { memo } from 'react';
import { Box, Divider, FormControl, MenuItem, Select } from '@mui/material';
import {
    Code,
    CheckBox,
    FormatAlignCenter,
    FormatAlignJustify,
    FormatAlignLeft,
    FormatAlignRight,
    FormatBold,
    FormatClear,
    FormatColorText,
    FormatItalic,
    FormatListBulleted,
    FormatListNumbered,
    FormatQuote,
    FormatStrikethrough,
    FormatUnderlined,
    Highlight as HighlightIcon,
    HorizontalRule,
    Image as ImageIcon,
    Link as LinkIcon,
    LinkOff,
    Redo,
    TableChart,
    Terminal,
    Undo,
} from '@mui/icons-material';
import { ToolbarAction, ToolbarGroup, ToolbarToggle } from './ToolbarControls';
import { dividerSx, toolbarSx } from './styles';

/** Предопределённая палитра цветов текста. */
export const COLORS = [
    { name: 'Чёрный', value: '#000000' },
    { name: 'Серый', value: '#6B7280' },
    { name: 'Красный', value: '#DC2626' },
    { name: 'Оранжевый', value: '#EA580C' },
    { name: 'Жёлтый', value: '#CA8A04' },
    { name: 'Зелёный', value: '#16A34A' },
    { name: 'Синий', value: '#2563EB' },
    { name: 'Фиолетовый', value: '#7C3AED' },
    { name: 'Белый', value: '#FFFFFF' },
];

const ALIGNMENTS = [
    { value: 'left', title: 'По левому краю', icon: <FormatAlignLeft fontSize="small" /> },
    { value: 'center', title: 'По центру', icon: <FormatAlignCenter fontSize="small" /> },
    { value: 'right', title: 'По правому краю', icon: <FormatAlignRight fontSize="small" /> },
    { value: 'justify', title: 'По ширине', icon: <FormatAlignJustify fontSize="small" /> },
];

/**
 * Панель инструментов редактора.
 *
 * Компонент полностью «глупый»: всё состояние приходит готовым из
 * `useEditorState` родителя. Это принципиально — в TipTap v3
 * `shouldRerenderOnTransaction` по умолчанию выключен, и обращаться к
 * `editor.isActive()` прямо в разметке нельзя: подсветка кнопок замрёт
 * на состоянии первого рендера.
 *
 * @param {object} props
 * @param {import('@tiptap/react').Editor} props.editor
 * @param {object} props.state              срез состояния редактора
 * @param {boolean} props.disabled
 * @param {(event: React.MouseEvent) => void} props.onOpenColors
 * @param {() => void} props.onOpenLink
 * @param {() => void} props.onOpenImage
 */
function Toolbar({ editor, state, disabled, onOpenColors, onOpenLink, onOpenImage }) {
    /** Короткая обёртка: любая команда выполняется с возвратом фокуса в текст. */
    const run = (fn) => () => fn(editor.chain().focus()).run();

    const setHeading = (value) => {
        if (value === 'paragraph') {
            editor.chain().focus().setParagraph().run();
            return;
        }

        editor.chain().focus().toggleHeading({ level: Number(value.slice(1)) }).run();
    };

    return (
        <Box sx={toolbarSx}>
            <ToolbarAction
                title="Отменить (Ctrl+Z)"
                onClick={run((chain) => chain.undo())}
                disabled={disabled || !state.canUndo}
            >
                <Undo fontSize="small" />
            </ToolbarAction>
            <ToolbarAction
                title="Повторить (Ctrl+Shift+Z)"
                onClick={run((chain) => chain.redo())}
                disabled={disabled || !state.canRedo}
            >
                <Redo fontSize="small" />
            </ToolbarAction>

            <Divider orientation="vertical" flexItem sx={dividerSx} />

            <ToolbarGroup>
                <ToolbarToggle
                    title="Полужирный (Ctrl+B)"
                    active={state.isBold}
                    disabled={disabled}
                    onClick={run((chain) => chain.toggleBold())}
                >
                    <FormatBold fontSize="small" />
                </ToolbarToggle>
                <ToolbarToggle
                    title="Курсив (Ctrl+I)"
                    active={state.isItalic}
                    disabled={disabled}
                    onClick={run((chain) => chain.toggleItalic())}
                >
                    <FormatItalic fontSize="small" />
                </ToolbarToggle>
                <ToolbarToggle
                    title="Подчёркнутый (Ctrl+U)"
                    active={state.isUnderline}
                    disabled={disabled}
                    onClick={run((chain) => chain.toggleUnderline())}
                >
                    <FormatUnderlined fontSize="small" />
                </ToolbarToggle>
                <ToolbarToggle
                    title="Зачёркнутый"
                    active={state.isStrike}
                    disabled={disabled}
                    onClick={run((chain) => chain.toggleStrike())}
                >
                    <FormatStrikethrough fontSize="small" />
                </ToolbarToggle>
            </ToolbarGroup>

            <Divider orientation="vertical" flexItem sx={dividerSx} />

            <FormControl size="small" sx={{ minWidth: 132 }}>
                <Select
                    value={state.blockType}
                    onChange={(event) => setHeading(event.target.value)}
                    disabled={disabled}
                    sx={{ height: 32 }}
                >
                    <MenuItem value="paragraph">Параграф</MenuItem>
                    <MenuItem value="h1">Заголовок 1</MenuItem>
                    <MenuItem value="h2">Заголовок 2</MenuItem>
                    <MenuItem value="h3">Заголовок 3</MenuItem>
                    <MenuItem value="h4">Заголовок 4</MenuItem>
                </Select>
            </FormControl>

            <Divider orientation="vertical" flexItem sx={dividerSx} />

            <ToolbarGroup>
                {ALIGNMENTS.map(({ value, title, icon }) => (
                    <ToolbarToggle
                        key={value}
                        title={title}
                        active={state.align === value}
                        disabled={disabled}
                        onClick={run((chain) => chain.setTextAlign(value))}
                    >
                        {icon}
                    </ToolbarToggle>
                ))}
            </ToolbarGroup>

            <Divider orientation="vertical" flexItem sx={dividerSx} />

            <ToolbarGroup>
                <ToolbarToggle
                    title="Маркированный список"
                    active={state.isBulletList}
                    disabled={disabled}
                    onClick={run((chain) => chain.toggleBulletList())}
                >
                    <FormatListBulleted fontSize="small" />
                </ToolbarToggle>
                <ToolbarToggle
                    title="Нумерованный список"
                    active={state.isOrderedList}
                    disabled={disabled}
                    onClick={run((chain) => chain.toggleOrderedList())}
                >
                    <FormatListNumbered fontSize="small" />
                </ToolbarToggle>
                <ToolbarToggle
                    title="Список задач"
                    active={state.isTaskList}
                    disabled={disabled}
                    onClick={run((chain) => chain.toggleTaskList())}
                >
                    <CheckBox fontSize="small" />
                </ToolbarToggle>
            </ToolbarGroup>

            <Divider orientation="vertical" flexItem sx={dividerSx} />

            <ToolbarGroup>
                <ToolbarToggle
                    title="Цитата"
                    active={state.isBlockquote}
                    disabled={disabled}
                    onClick={run((chain) => chain.toggleBlockquote())}
                >
                    <FormatQuote fontSize="small" />
                </ToolbarToggle>
                <ToolbarToggle
                    title="Встроенный код"
                    active={state.isCode}
                    disabled={disabled}
                    onClick={run((chain) => chain.toggleCode())}
                >
                    <Code fontSize="small" />
                </ToolbarToggle>
                <ToolbarToggle
                    title="Блок кода"
                    active={state.isCodeBlock}
                    disabled={disabled}
                    onClick={run((chain) => chain.toggleCodeBlock())}
                >
                    <Terminal fontSize="small" />
                </ToolbarToggle>
            </ToolbarGroup>

            <ToolbarAction
                title="Горизонтальная линия"
                disabled={disabled}
                onClick={run((chain) => chain.setHorizontalRule())}
            >
                <HorizontalRule fontSize="small" />
            </ToolbarAction>

            <Divider orientation="vertical" flexItem sx={dividerSx} />

            <ToolbarAction
                title="Цвет текста"
                disabled={disabled}
                highlighted={Boolean(state.color)}
                onClick={onOpenColors}
            >
                <FormatColorText fontSize="small" sx={{ color: state.color || undefined }} />
            </ToolbarAction>
            <ToolbarGroup>
                <ToolbarToggle
                    title="Выделение маркером"
                    active={state.isHighlight}
                    disabled={disabled}
                    onClick={run((chain) => chain.toggleHighlight())}
                >
                    <HighlightIcon fontSize="small" />
                </ToolbarToggle>
            </ToolbarGroup>

            <Divider orientation="vertical" flexItem sx={dividerSx} />

            <ToolbarAction
                title={state.isLink ? 'Редактировать ссылку' : 'Вставить ссылку'}
                disabled={disabled}
                highlighted={state.isLink}
                onClick={onOpenLink}
            >
                <LinkIcon fontSize="small" />
            </ToolbarAction>
            {state.isLink && (
                <ToolbarAction
                    title="Убрать ссылку"
                    disabled={disabled}
                    onClick={run((chain) => chain.extendMarkRange('link').unsetLink())}
                >
                    <LinkOff fontSize="small" />
                </ToolbarAction>
            )}
            <ToolbarAction title="Вставить изображение" disabled={disabled} onClick={onOpenImage}>
                <ImageIcon fontSize="small" />
            </ToolbarAction>
            <ToolbarAction
                title="Вставить таблицу 3×3"
                disabled={disabled}
                onClick={run((chain) =>
                    chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
                )}
            >
                <TableChart fontSize="small" />
            </ToolbarAction>

            <Divider orientation="vertical" flexItem sx={dividerSx} />

            <ToolbarAction
                title="Очистить форматирование"
                disabled={disabled}
                onClick={run((chain) => chain.clearNodes().unsetAllMarks())}
            >
                <FormatClear fontSize="small" />
            </ToolbarAction>
        </Box>
    );
}

export default memo(Toolbar);

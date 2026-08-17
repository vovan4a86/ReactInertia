import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { Box, Popover, Typography } from '@mui/material';
import Toolbar, { COLORS } from './Toolbar';
import { ColorPalette, ImageDialog, LinkDialog } from './Dialogs';
import { buildExtensions } from './extensions';
import { containerSx, contentSx } from './styles';

/**
 * Пустой документ TipTap отдаётся как `<p></p>`. Для настройки это мусор:
 * значение перестаёт быть «пустым», витрина рисует лишний абзац,
 * а проверки вида `if (!$setting->value)` не срабатывают.
 *
 * @param {import('@tiptap/react').Editor} editor
 * @returns {string} HTML либо '' для пустого документа
 */
function readHtml(editor) {
    return editor.isEmpty ? '' : editor.getHTML();
}

/** Поверхностное сравнение срезов состояния для useEditorState. */
function shallowEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;

    const keys = Object.keys(a);

    return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

/**
 * WYSIWYG-редактор на TipTap v3 для настроек типа «Редактор».
 *
 * Что здесь решено принципиально:
 *
 * 1. **Стабильный `onChange`.** `useEditor` создаёт редактор один раз, и колбэк
 *    `onUpdate` навсегда захватывает первый `onChange`. В модуле настроек
 *    `onChange` пересоздаётся на каждый рендер формы, поэтому редактор писал бы
 *    в устаревшее замыкание и правки терялись. Актуальный колбэк держим в ref.
 *
 * 2. **Debounce.** Прежняя версия дёргала `onChange` на каждое нажатие клавиши,
 *    а это перерисовка всей формы настроек (галереи, повторители) на символ.
 *    Теперь изменения копятся и уходят пачкой; несохранённое принудительно
 *    выталкивается при blur и при размонтировании.
 *
 * 3. **Синхронизация извне.** `content` — только начальное значение. После
 *    сохранения сервер возвращает очищенный санитайзером HTML, форма
 *    ресинхронизируется, а редактор оставался со старым текстом. Теперь входящее
 *    значение сравнивается с текущим и аккуратно применяется с сохранением
 *    позиции курсора и без повторного `onUpdate`.
 *
 * 4. **`shouldRerenderOnTransaction: false`.** Значение по умолчанию в v3.
 *    Состояние кнопок берётся через `useEditorState`, иначе подсветка
 *    «залипает» на первом рендере.
 *
 * 5. **`immediatelyRender: false`.** Обязательно для Inertia SSR — иначе
 *    TipTap бросает ошибку при обнаружении серверного рендеринга.
 *
 * @param {object}   props
 * @param {string}   [props.value='']            HTML-значение настройки
 * @param {(html: string) => void} props.onChange
 * @param {string}   [props.placeholder]
 * @param {boolean}  [props.disabled=false]
 * @param {number}   [props.debounceMs=300]
 * @param {number}   [props.minHeight=200]
 * @param {number}   [props.maxHeight=520]
 * @param {boolean}  [props.allowBase64=false]   разрешить вставку data:URI картинок
 */
function RichTextEditor({
    value = '',
    onChange,
    placeholder = 'Введите текст...',
    disabled = false,
    debounceMs = 300,
    minHeight = 200,
    maxHeight = 520,
    allowBase64 = false,
}) {
    const [linkOpen, setLinkOpen] = useState(false);
    const [imageOpen, setImageOpen] = useState(false);
    const [colorAnchor, setColorAnchor] = useState(null);

    // --- актуальный onChange без пересоздания редактора -----------------
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    });

    // --- debounce ------------------------------------------------------
    const timerRef = useRef(null);
    const pendingRef = useRef(null);
    /** Последний HTML, о котором договорились редактор и форма. */
    const syncedRef = useRef(value ?? '');

    const flush = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (pendingRef.current === null) {
            return;
        }

        const html = pendingRef.current;
        pendingRef.current = null;
        syncedRef.current = html;
        onChangeRef.current?.(html);
    }, []);

    const schedule = useCallback(
        (html) => {
            pendingRef.current = html;

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(flush, debounceMs);
        },
        [debounceMs, flush],
    );

    // Расширения собираем один раз: пересоздание массива пересоздаёт схему.
    const extensions = useMemo(
        () => buildExtensions({ placeholder, allowBase64 }),
        [placeholder, allowBase64],
    );

    const editor = useEditor({
        extensions,
        content: value ?? '',
        editable: !disabled,
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
        editorProps: {
            attributes: { class: 'prose-editor', spellCheck: 'true' },
        },
        onUpdate: ({ editor: instance }) => schedule(readHtml(instance)),
        onBlur: () => flush(),
    });

    // Выталкиваем несохранённое при размонтировании (переход по вкладкам групп).
    useEffect(() => flush, [flush]);

    // Переключение режима «только чтение».
    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [editor, disabled]);

    // Приём значения извне (ресинк после сохранения, сброс формы).
    useEffect(() => {
        if (!editor) {
            return;
        }

        const incoming = value ?? '';

        // Это наш собственный, уже отданный наружу HTML.
        if (incoming === syncedRef.current) {
            return;
        }

        // Пользователь печатает прямо сейчас — не затираем ввод.
        if (pendingRef.current !== null) {
            return;
        }

        if (incoming === readHtml(editor)) {
            syncedRef.current = incoming;
            return;
        }

        const { from, to } = editor.state.selection;

        editor.commands.setContent(incoming, { emitUpdate: false });
        syncedRef.current = incoming;

        // Восстанавливаем каретку, если позиция всё ещё валидна.
        const size = editor.state.doc.content.size;
        if (from <= size && to <= size) {
            editor.commands.setTextSelection({ from, to });
        }
    }, [editor, value]);

    // Срез состояния для панели: пересчитывается на каждой транзакции,
    // но перерисовывает тулбар только при реальном изменении.
    const state = useEditorState({
        editor,
        selector: ({ editor: instance }) => {
            if (!instance) {
                return null;
            }

            const heading = [1, 2, 3, 4].find((level) =>
                instance.isActive('heading', { level }),
            );

            const align = ['left', 'center', 'right', 'justify'].find((value) =>
                instance.isActive({ textAlign: value }),
            );

            return {
                isBold: instance.isActive('bold'),
                isItalic: instance.isActive('italic'),
                isUnderline: instance.isActive('underline'),
                isStrike: instance.isActive('strike'),
                isBulletList: instance.isActive('bulletList'),
                isOrderedList: instance.isActive('orderedList'),
                isTaskList: instance.isActive('taskList'),
                isBlockquote: instance.isActive('blockquote'),
                isCode: instance.isActive('code'),
                isCodeBlock: instance.isActive('codeBlock'),
                isHighlight: instance.isActive('highlight'),
                isLink: instance.isActive('link'),
                linkHref: instance.getAttributes('link').href ?? '',
                // Цвет живёт в атрибуте mark `textStyle`; `isActive('color')`
                // из прежней версии всегда возвращал false — такой марки нет.
                color: instance.getAttributes('textStyle').color ?? null,
                blockType: heading ? `h${heading}` : 'paragraph',
                align: align ?? null,
                canUndo: instance.can().undo(),
                canRedo: instance.can().redo(),
            };
        },
        equalityFn: shallowEqual,
    });

    const applyLink = useCallback(
        (href) => {
            editor?.chain().focus().extendMarkRange('link').setLink({ href }).run();
            setLinkOpen(false);
        },
        [editor],
    );

    const removeLink = useCallback(() => {
        editor?.chain().focus().extendMarkRange('link').unsetLink().run();
        setLinkOpen(false);
    }, [editor]);

    const applyImage = useCallback(
        (src, alt) => {
            editor?.chain().focus().setImage({ src, alt: alt || null }).run();
            setImageOpen(false);
        },
        [editor],
    );

    const applyColor = useCallback(
        (color) => {
            const chain = editor?.chain().focus();
            (color === null ? chain?.unsetColor() : chain?.setColor(color))?.run();
            setColorAnchor(null);
        },
        [editor],
    );

    if (!editor || !state) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">Загрузка редактора…</Typography>
            </Box>
        );
    }

    return (
        <Box sx={containerSx}>
            <Toolbar
                editor={editor}
                state={state}
                disabled={disabled}
                onOpenColors={(event) => setColorAnchor(event.currentTarget)}
                onOpenLink={() => setLinkOpen(true)}
                onOpenImage={() => setImageOpen(true)}
            />

            <Box sx={contentSx(minHeight, maxHeight)} onClick={() => editor.chain().focus().run()}>
                <EditorContent editor={editor} />
            </Box>

            <Popover
                open={Boolean(colorAnchor)}
                anchorEl={colorAnchor}
                onClose={() => setColorAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <ColorPalette colors={COLORS} current={state.color} onSelect={applyColor} />
            </Popover>

            <LinkDialog
                open={linkOpen}
                initialUrl={state.linkHref}
                isEditing={state.isLink}
                onSubmit={applyLink}
                onRemove={removeLink}
                onClose={() => setLinkOpen(false)}
            />

            <ImageDialog
                open={imageOpen}
                allowBase64={allowBase64}
                onSubmit={applyImage}
                onClose={() => setImageOpen(false)}
            />
        </Box>
    );
}

export default memo(RichTextEditor);

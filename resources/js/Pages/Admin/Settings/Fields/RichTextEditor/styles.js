/**
 * Стили редактора.
 *
 * Прежняя версия хардкодила два набора hex-цветов и ветвилась на
 * `isDarkMode ? '#424242' : '#e0e0e0'`. Из-за этого редактор игнорировал
 * кастомную палитру проекта. Здесь используются токены темы
 * (divider, background.paper, text.primary, action.selected), поэтому
 * тёмная/светлая/брендовая темы работают без единого условия.
 */

/** Контейнер редактора с подсветкой фокуса. */
export const containerSx = {
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    overflow: 'hidden',
    bgcolor: 'background.paper',
    transition: (theme) => theme.transitions.create(['border-color', 'box-shadow']),
    '&:focus-within': {
        borderColor: 'primary.main',
        boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}33`,
    },
};

/** Панель инструментов. */
export const toolbarSx = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 0.5,
    p: 0.5,
    borderBottom: 1,
    borderColor: 'divider',
    bgcolor: 'action.hover',
    position: 'sticky',
    top: 0,
    zIndex: 2,
};

/** Разделитель групп кнопок. */
export const dividerSx = { mx: 0.25, my: 0.5 };

/**
 * Область контента.
 *
 * @param {number} minHeight минимальная высота поля ввода, px
 * @param {number} maxHeight высота, после которой включается прокрутка, px
 */
export const contentSx = (minHeight = 200, maxHeight = 520) => ({
    maxHeight,
    overflowY: 'auto',
    cursor: 'text',

    '& .ProseMirror': {
        minHeight,
        p: 2,
        outline: 'none',
        color: 'text.primary',
        wordBreak: 'break-word',

        '& p.is-editor-empty:first-of-type::before': {
            content: 'attr(data-placeholder)',
            float: 'left',
            height: 0,
            pointerEvents: 'none',
            color: 'text.disabled',
        },

        '& :where(h1, h2, h3, h4, h5, h6)': {
            color: 'text.primary',
            lineHeight: 1.25,
            mt: 2,
            mb: 1,
        },

        '& img': {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: 1,
            '&.ProseMirror-selectednode': {
                outline: (theme) => `3px solid ${theme.palette.primary.main}`,
            },
        },

        '& a': { color: 'primary.main' },

        '& table': {
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            width: '100%',
            my: 2,
            overflow: 'hidden',
            '& :where(td, th)': {
                border: 1,
                borderColor: 'divider',
                boxSizing: 'border-box',
                minWidth: '1em',
                p: '4px 8px',
                position: 'relative',
                verticalAlign: 'top',
                '& > *': { mb: 0 },
            },
            '& th': {
                bgcolor: 'action.hover',
                fontWeight: 600,
                textAlign: 'left',
            },
            '& .selectedCell::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 2,
                bgcolor: (theme) => `${theme.palette.primary.main}26`,
            },
            // Ручка изменения ширины колонки (Table.resizable)
            '& .column-resize-handle': {
                position: 'absolute',
                right: -2,
                top: 0,
                bottom: 0,
                width: 4,
                pointerEvents: 'none',
                bgcolor: 'primary.main',
            },
        },

        '& pre': {
            bgcolor: 'grey.900',
            color: 'common.white',
            borderRadius: 1,
            p: 1.5,
            overflowX: 'auto',
            fontFamily: 'ui-monospace, "JetBrains Mono", "Fira Code", monospace',
            '& code': { background: 'none', color: 'inherit', p: 0, fontSize: '0.8rem' },
        },

        '& code': {
            bgcolor: 'action.selected',
            borderRadius: 0.5,
            px: 0.5,
            py: 0.25,
            fontSize: '0.875em',
        },

        '& blockquote': {
            borderLeft: 3,
            borderColor: 'divider',
            pl: 2,
            my: 2,
            color: 'text.secondary',
        },

        '& hr': {
            border: 'none',
            borderTop: 2,
            borderColor: 'divider',
            my: 3,
        },

        '& :where(ul, ol)': { pl: 3 },

        '& ul[data-type="taskList"]': {
            listStyle: 'none',
            pl: 0,
            '& li': {
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                '& > label': { flex: '0 0 auto', mt: '2px', userSelect: 'none' },
                '& > div': { flex: '1 1 auto' },
            },
        },

        '& mark': {
            borderRadius: 0.5,
            px: 0.25,
            // без явного color текст на цветной подложке в тёмной теме пропадал
            color: (theme) => theme.palette.getContrastText(theme.palette.warning.light),
            bgcolor: 'warning.light',
        },

        // Режим «только чтение»
        '&[contenteditable="false"]': {
            opacity: 0.6,
            cursor: 'default',
        },
    },
});

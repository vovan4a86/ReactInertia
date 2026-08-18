import { styled } from '@mui/material/styles';

/** Размеры «компактной» темы дерева — единый источник истины. */
export const TREE_METRICS = {
    rowHeight: 26,
    indent: 18,
    padding: 4,
};

/**
 * Контейнер дерева: тут живут стили пунктирных линий и состояний строки.
 * Классы (.rt-*) навешивает TreeNode — так стили не пересоздаются на каждый узел.
 */
export const TreeSurface = styled('div', { name: 'TreeSurface' })(({ theme }) => ({
    '--tree-guide': theme.palette.divider,
    fontSize: 13,
    userSelect: 'none',

    '& .rt-row': {
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        paddingRight: theme.spacing(0.5),
        borderRadius: theme.shape.borderRadius,
        cursor: 'pointer',
        outline: 'none',
        transition: theme.transitions.create(['background-color'], { duration: 120 }),
    },
    '& .rt-row:hover': { backgroundColor: theme.palette.action.hover },
    '& .rt-row.rt-focused': { boxShadow: `inset 0 0 0 1px ${theme.palette.primary.main}` },
    '& .rt-row.rt-selected': {
        backgroundColor: theme.palette.action.selected,
        fontWeight: 600,
    },
    '& .rt-row.rt-match': { backgroundColor: theme.palette.warning.light },
    '& .rt-row.rt-unpublished .rt-label': {
        color: theme.palette.text.disabled,
        fontStyle: 'italic',
    },
    '& .rt-row.rt-dragging': { opacity: 0.4 },

    /* --- пунктирные направляющие, как в jsTree default --- */
    '& .rt-guide': {
        flex: `0 0 ${TREE_METRICS.indent}px`,
        alignSelf: 'stretch',
        position: 'relative',
    },
    '& .rt-guide.rt-guide-line::before': {
        content: '""',
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        borderLeft: '1px dashed var(--tree-guide)',
    },
    /* «колено»: вертикаль до середины + горизонталь вправо */
    '& .rt-elbow::before': {
        content: '""',
        position: 'absolute',
        left: '50%',
        top: 0,
        height: '50%',
        borderLeft: '1px dashed var(--tree-guide)',
    },
    '& .rt-elbow.rt-elbow-through::before': { height: '100%' },
    '& .rt-elbow::after': {
        content: '""',
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: '50%',
        borderTop: '1px dashed var(--tree-guide)',
    },

    '& .rt-toggle': {
        flex: '0 0 16px',
        display: 'grid',
        placeItems: 'center',
        height: 16,
        zIndex: 1,
        background: theme.palette.background.paper,
        color: theme.palette.text.secondary,
    },
    '& .rt-label': {
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
    },
    '& .rt-input': {
        flex: 1,
        minWidth: 0,
        font: 'inherit',
        padding: '0 4px',
        border: `1px solid ${theme.palette.primary.main}`,
        borderRadius: 3,
        background: theme.palette.background.paper,
        color: theme.palette.text.primary,
    },
    /* курсор вставки при drag&drop */
    '& .rt-cursor': {
        position: 'absolute',
        pointerEvents: 'none',
        height: 2,
        borderRadius: 2,
        backgroundColor: theme.palette.primary.main,
        '&::before': {
            content: '""',
            position: 'absolute',
            left: -3,
            top: -3,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: theme.palette.primary.main,
        },
    },
}));

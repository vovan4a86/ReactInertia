import { memo, useCallback, useDeferredValue, useMemo, useOptimistic, useState, useTransition } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    alpha, Avatar, Box, Chip, CircularProgress, IconButton, InputAdornment, Menu, MenuItem,
    ListItemIcon, ListItemText, Paper, Stack, Switch, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    ArrowDownward as ArrowDownIcon,
    ArrowUpward as ArrowUpIcon,
    ContentCopy as CopyIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    ExpandMore as ExpandMoreIcon,
    ChevronRight as ChevronRightIcon,
    ImageNotSupported as NoImageIcon,
    MoreVert as MoreVertIcon,
    OpenInNew as OpenInNewIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    UnfoldLess as CollapseAllIcon,
    UnfoldMore as ExpandAllIcon,
} from '@mui/icons-material';

/* ═══════════════════════ Утилиты дерева ═══════════════════════ */

const MENU_BADGES = [
    { key: 'on_header_menu', short: 'H', title: 'В шапке' },
    { key: 'on_footer_menu', short: 'F', title: 'В подвале' },
    { key: 'on_mobile_menu', short: 'M', title: 'В мобильном меню' },
];

/**
 * Обход дерева в глубину — порядок строго как в дереве.
 * Сортировка по колонкам намеренно отсутствует: любой пересорт
 * разрывает связь «родитель → потомок» и делает значок родителя ложным.
 */
function flattenTree(nodes, { expanded, depth = 0, parentName = null, out = [] } = {}) {
    for (const node of nodes ?? []) {
        const children = node.children ?? [];
        const hasChildren = children.length > 0;

        out.push({ ...node, depth, parentName, hasChildren, childCount: children.length });

        if (hasChildren && expanded.has(node.id)) {
            flattenTree(children, { expanded, depth: depth + 1, parentName: node.name, out });
        }
    }

    return out;
}

/** Ищем совпадения и оставляем всех предков найденных узлов. */
function filterTree(nodes, needle) {
    const result = [];

    for (const node of nodes ?? []) {
        const children = filterTree(node.children ?? [], needle);
        const hit =
            node.name?.toLowerCase().includes(needle) ||
            node.alias?.toLowerCase().includes(needle) ||
            node.slug?.toLowerCase().includes(needle);

        if (hit || children.length) {
            result.push({ ...node, children: children.length ? children : (hit ? node.children : null) });
        }
    }

    return result;
}

const collectIds = (nodes, acc = new Set()) => {
    for (const n of nodes ?? []) {
        if (n.children?.length) {
            acc.add(n.id);
            collectIds(n.children, acc);
        }
    }
    return acc;
};

/** Подсветка совпадения без dangerouslySetInnerHTML. */
function Highlight({ text = '', needle }) {
    if (!needle) return text;

    const idx = text.toLowerCase().indexOf(needle);
    if (idx === -1) return text;

    return (
        <>
            {text.slice(0, idx)}
            <Box component="mark" sx={{ bgcolor: 'warning.light', px: 0.25, borderRadius: 0.5 }}>
                {text.slice(idx, idx + needle.length)}
            </Box>
            {text.slice(idx + needle.length)}
        </>
    );
}

/* ═══════════════════════ Строка таблицы ═══════════════════════ */

const PageRow = memo(function PageRow({
                                          row, selected, needle, busy, onSelect, onToggle, onPublish, onMenu, onMove,
                                      }) {
    const indent = row.depth * 24;

    return (
        <TableRow
            hover
            selected={selected}
            onClick={() => onSelect(row.id)}
            sx={{
                cursor: 'pointer',
                opacity: row.published ? 1 : 0.55,
                '& td': { py: 0.75, borderColor: 'divider' },
                '&.Mui-selected': { bgcolor: (t) => alpha(t.palette.primary.main, 0.1) },
            }}
        >
            {/* ── Название + иерархия ── */}
            <TableCell sx={{ pl: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ pl: `${indent}px`, position: 'relative' }}>
                    {row.depth > 0 && (
                        <Box
                            aria-hidden
                            sx={{
                                position: 'absolute', left: indent - 14, top: 0, bottom: 0,
                                width: 12, borderLeft: '1px solid', borderBottom: '1px solid',
                                borderColor: 'divider', height: '50%', borderBottomLeftRadius: 4,
                            }}
                        />
                    )}

                    <IconButton
                        size="small"
                        disabled={!row.hasChildren}
                        onClick={(e) => { e.stopPropagation(); onToggle(row.id); }}
                        sx={{ p: 0.25, visibility: row.hasChildren ? 'visible' : 'hidden' }}
                    >
                        {row.expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                    </IconButton>

                    {/* 🖼 Аватарка страницы (image_thumb) */}
                    <Avatar
                        src={row.image_thumb || undefined}
                        variant="rounded"
                        sx={{
                            width: 34, height: 34, fontSize: '.8rem', flexShrink: 0,
                            bgcolor: row.image_thumb ? 'transparent' : 'action.hover',
                            color: 'text.secondary',
                        }}
                    >
                        {row.name?.[0]?.toUpperCase() ?? <NoImageIcon fontSize="small" />}
                    </Avatar>

                    <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Typography variant="body2" fontWeight={row.depth === 0 ? 600 : 400} noWrap>
                                <Highlight text={row.name} needle={needle} />
                            </Typography>

                            {row.hasChildren && (
                                <Chip
                                    size="small"
                                    label={row.childCount}
                                    sx={{ height: 16, fontSize: '.65rem', '& .MuiChip-label': { px: 0.6 } }}
                                />
                            )}
                        </Stack>

                        <Typography variant="caption" color="text.secondary" noWrap component="div">
                            {row.parentName ? `↳ ${row.parentName} / ` : ''}
                            {row.alias || '—'}
                        </Typography>
                    </Box>
                </Stack>
            </TableCell>

            {/* ── Меню ── */}
            <TableCell align="center" width={110}>
                <Stack direction="row" spacing={0.4} justifyContent="center">
                    {MENU_BADGES.map(({ key, short, title }) => (
                        <Tooltip key={key} title={`${title}: ${row[key] ? 'да' : 'нет'}`}>
                            <Box
                                sx={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    display: 'grid', placeItems: 'center',
                                    fontSize: '.65rem', fontWeight: 700,
                                    bgcolor: (t) => row[key] ? alpha(t.palette.success.main, 0.15) : 'action.hover',
                                    color: row[key] ? 'success.main' : 'text.disabled',
                                }}
                            >
                                {short}
                            </Box>
                        </Tooltip>
                    ))}
                </Stack>
            </TableCell>

            {/* ── Публикация ── */}
            <TableCell align="center" width={90} onClick={(e) => e.stopPropagation()}>
                <Tooltip title={row.published ? 'Снять с публикации' : 'Опубликовать'}>
                    <Switch
                        size="small"
                        checked={Boolean(row.published)}
                        onChange={() => onPublish(row)}
                    />
                </Tooltip>
            </TableCell>

            {/* ── Порядок ── */}
            <TableCell align="center" width={80} onClick={(e) => e.stopPropagation()}>
                <Stack direction="row" spacing={0}>
                    <IconButton size="small" disabled={busy} onClick={() => onMove(row, -1)} sx={{ p: 0.25 }}>
                        <ArrowUpIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" disabled={busy} onClick={() => onMove(row, 1)} sx={{ p: 0.25 }}>
                        <ArrowDownIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Stack>
            </TableCell>

            {/* ── Действия ── */}
            <TableCell align="right" width={90} onClick={(e) => e.stopPropagation()}>
                <Stack direction="row" spacing={0} justifyContent="flex-end">
                    {busy && <CircularProgress size={14} sx={{ mr: 0.5, alignSelf: 'center' }} />}

                    <Tooltip title="Редактировать">
                        <IconButton size="small" component={Link} href={route('admin.pages.show', row.id)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <IconButton size="small" onClick={(e) => onMenu(e, row)}>
                        <MoreVertIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </TableCell>
        </TableRow>
    );
});

/* ═══════════════════════ Основной компонент ═══════════════════════ */

export default function PagesList({ tree = [], selectedId = null }) {
    const [search, setSearch]     = useState('');
    const [expanded, setExpanded] = useState(() => collectIds(tree));
    const [anchor, setAnchor]     = useState(null);
    const [target, setTarget]     = useState(null);
    const [busyId, setBusyId]     = useState(null);
    const [, startTransition]     = useTransition();

    /* ⚡ Оптимистичная публикация — UI не ждёт ответ сервера */
    const [optimistic, applyOptimistic] = useOptimistic(
        tree,
        (state, { id, published }) => {
            const patch = (nodes) => nodes?.map((n) => ({
                ...n,
                published: n.id === id ? published : n.published,
                children: patch(n.children),
            })) ?? null;

            return patch(state);
        },
    );

    const deferredSearch = useDeferredValue(search);
    const needle = deferredSearch.trim().toLowerCase();

    const visibleTree = useMemo(
        () => (needle ? filterTree(optimistic, needle) : optimistic),
        [optimistic, needle],
    );

    /* При активном поиске разворачиваем всё найденное */
    const effectiveExpanded = useMemo(
        () => (needle ? collectIds(visibleTree) : expanded),
        [needle, visibleTree, expanded],
    );

    const rows = useMemo(
        () => flattenTree(visibleTree, { expanded: effectiveExpanded })
            .map((r) => ({ ...r, expanded: effectiveExpanded.has(r.id) })),
        [visibleTree, effectiveExpanded],
    );

    const allIds = useMemo(() => collectIds(tree), [tree]);

    /* ── Handlers ── */

    const handleToggle = useCallback((id) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const openPage = useCallback((id) => {
        router.visit(route('admin.pages.show', id), {
            preserveState: true,   // дерево не размонтируется → раскрытые узлы живы
            preserveScroll: true,
            only: ['page', 'parents', 'mode', 'flash'],
        });
    }, []);

    const handlePublish = useCallback((row) => {
        startTransition(async () => {
            applyOptimistic({ id: row.id, published: !row.published });

            await new Promise((resolve) => {
                router.patch(
                    route('admin.pages.toggle', row.id),
                    { field: 'published' },
                    { preserveScroll: true, preserveState: true, only: ['tree'], onFinish: resolve },
                );
            });
        });
    }, [applyOptimistic]);

    const handleMove = useCallback((row, delta) => {
        setBusyId(row.id);

        router.patch(
            route('admin.pages.move', row.id),
            { parent_id: row.parent_id ?? null, index: Math.max(0, (row.order ?? 0) + delta) },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['tree'],
                onFinish: () => setBusyId(null),
            },
        );
    }, []);

    const openMenu  = useCallback((e, row) => { setAnchor(e.currentTarget); setTarget(row); }, []);
    const closeMenu = useCallback(() => { setAnchor(null); setTarget(null); }, []);

    const runAction = useCallback((action) => {
        if (!target) return;
        const row = target;
        closeMenu();

        if (action === 'duplicate') {
            router.post(route('admin.pages.duplicate', row.id), {}, { preserveScroll: true });
            return;
        }

        if (action === 'delete') {
            if (!confirm(`Удалить «${row.name}»?${row.hasChildren ? '\nВложенные страницы будут подняты на уровень выше.' : ''}`)) return;
            router.delete(route('admin.pages.destroy', row.id), { preserveScroll: true });
            return;
        }

        if (action === 'create-child') {
            router.get(route('admin.pages.create'), { parent_id: row.id });
        }
    }, [target, closeMenu]);

    /* ── Render ── */

    return (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Поиск по названию или alias…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: search && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearch('')}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                />

                <Tooltip title="Развернуть всё">
                    <IconButton size="small" onClick={() => setExpanded(new Set(allIds))}>
                        <ExpandAllIcon fontSize="small" />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Свернуть всё">
                    <IconButton size="small" onClick={() => setExpanded(new Set())}>
                        <CollapseAllIcon fontSize="small" />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Новая страница">
                    <IconButton size="small" color="primary" component={Link} href={route('admin.pages.create')}>
                        <AddIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>

            <TableContainer sx={{ maxHeight: 'calc(100vh - 220px)' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 600, fontSize: '.75rem', whiteSpace: 'nowrap' } }}>
                            {/* ⛔️ Никаких TableSortLabel: порядок только иерархический */}
                            <TableCell>Страница</TableCell>
                            <TableCell align="center">Меню</TableCell>
                            <TableCell align="center">Публ.</TableCell>
                            <TableCell align="center">Порядок</TableCell>
                            <TableCell align="right">Действия</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {rows.map((row) => (
                            <PageRow
                                key={row.id}
                                row={row}
                                needle={needle}
                                selected={String(selectedId) === String(row.id)}
                                busy={busyId === row.id}
                                onSelect={() => openPage(row.id)}
                                onToggle={handleToggle}
                                onPublish={handlePublish}
                                onMove={handleMove}
                                onMenu={openMenu}
                            />
                        ))}

                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5}>
                                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                                        {needle ? 'Ничего не найдено' : 'Страниц пока нет'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={closeMenu}>
                {target?.url && (
                    <MenuItem component="a" href={target.url} target="_blank" rel="noopener" onClick={closeMenu}>
                        <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>Открыть на сайте</ListItemText>
                    </MenuItem>
                )}

                <MenuItem onClick={() => runAction('create-child')}>
                    <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Добавить дочернюю</ListItemText>
                </MenuItem>

                <MenuItem onClick={() => runAction('duplicate')}>
                    <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Дублировать</ListItemText>
                </MenuItem>

                <MenuItem onClick={() => runAction('delete')} sx={{ color: 'error.main' }}>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText>Удалить</ListItemText>
                </MenuItem>
            </Menu>
        </Paper>
    );
}

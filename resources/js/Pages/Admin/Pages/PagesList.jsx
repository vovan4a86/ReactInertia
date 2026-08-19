import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Avatar,
    Box,
    Chip,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TableSortLabel,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    OpenInNew as OpenInNewIcon,
    VisibilityOff as VisibilityOffIcon,
    Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';

// Функция для сортировки
function descendingComparator(a, b, orderBy) {
    if (b[orderBy] < a[orderBy]) return -1;
    if (b[orderBy] > a[orderBy]) return 1;
    return 0;
}

function getComparator(order, orderBy) {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

// Заголовки таблицы
const HEAD_CELLS = [
    { id: 'image',      label: '',              sortable: false, width: 56   },
    { id: 'name',       label: 'Название',      sortable: true               },
    { id: 'slug',       label: 'URL',           sortable: true               },
    { id: 'published',  label: 'Статус',        sortable: true,  width: 110  },
    { id: 'in_menu',    label: 'Меню',          sortable: false, width: 90   },
    { id: 'actions',    label: '',              sortable: false, width: 120  },
];

const MENU_DOTS = [
    { key: 'on_header_menu',  title: 'В шапке'         },
    { key: 'on_footer_menu',  title: 'В подвале'        },
    { key: 'on_mobile_menu',  title: 'В мобильном меню' },
];

function MenuDots({ row }) {
    return (
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
            {MENU_DOTS.map(({ key, title }) => (
                <Tooltip key={key} title={row[key] ? title : `Не ${title.toLowerCase()}`}>
                    <Box
                        sx={{
                            width: 10, height: 10, borderRadius: '50%',
                            bgcolor: row[key] ? 'success.main' : 'divider',
                            flexShrink: 0,
                        }}
                    />
                </Tooltip>
            ))}
        </Box>
    );
}

/**
 * Табличный вид страниц.
 * Навигация через Inertia (router.visit) без пропсов-колбэков:
 * все переходы — частичные перезагрузки Index.
 *
 * @param {Array}  props.pages   плоский список узлов (из flatten(tree))
 */
export default function PagesList({ pages = [] }) {
    const [order,       setOrder]       = useState('asc');
    const [orderBy,     setOrderBy]     = useState('name');
    const [page,        setPage]        = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    /* ── сортировка ── */
    const sorted = useMemo(
        () => [...pages].sort(getComparator(order, orderBy)),
        [pages, order, orderBy],
    );

    /* ── пагинация ── */
    const paginated = useMemo(
        () => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [sorted, page, rowsPerPage],
    );

    const handleSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    /* ── Inertia-навигация ── */
    const openEdit = (id) =>
        router.visit(route('admin.pages.show', id), {
            preserveState: true,
            preserveScroll: true,
            only: ['page', 'parents', 'mode', 'flash'],
        });

    const openCreate = (parentId) =>
        router.get(route('admin.pages.create'), { parent: parentId }, {
            preserveState: true,
            preserveScroll: true,
            only: ['page', 'parents', 'mode'],
        });

    const togglePublished = (id) =>
        router.put(route('admin.pages.toggle', id), {}, {
            preserveState: true,
            preserveScroll: true,
            only: ['tree', 'page', 'flash'],
        });

    const deletePage = (id, name) => {
        if (!window.confirm(`Удалить страницу «${name}»?`)) return;
        router.delete(route('admin.pages.destroy', id), { preserveScroll: true });
    };

    /* ── пустое состояние ── */
    if (pages.length === 0) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 1 }}>
                <Typography variant="h6" color="text.secondary">Страниц пока нет</Typography>
                <Typography variant="body2" color="text.secondary">
                    Создайте первую страницу, используя кнопку «Добавить»
                </Typography>
            </Box>
        );
    }

    /* ══════════════════════════ render ══════════════════════════ */
    return (
        <Paper variant="outlined" sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 240px)' }}>
                <Table stickyHeader size="small">

                    {/* ── Шапка ── */}
                    <TableHead>
                        <TableRow>
                            {HEAD_CELLS.map((cell) => (
                                <TableCell
                                    key={cell.id}
                                    width={cell.width}
                                    sortDirection={orderBy === cell.id ? order : false}
                                    sx={{ fontWeight: 600, bgcolor: 'background.paper' }}
                                >
                                    {cell.sortable ? (
                                        <TableSortLabel
                                            active={orderBy === cell.id}
                                            direction={orderBy === cell.id ? order : 'asc'}
                                            onClick={() => handleSort(cell.id)}
                                        >
                                            {cell.label}
                                            {orderBy === cell.id && (
                                                <Box component="span" sx={visuallyHidden}>
                                                    {order === 'desc' ? 'по убыванию' : 'по возрастанию'}
                                                </Box>
                                            )}
                                        </TableSortLabel>
                                    ) : (
                                        cell.label
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    {/* ── Строки ── */}
                    <TableBody>
                        {paginated.map((row) => (
                            <TableRow
                                key={row.id}
                                hover
                                sx={{ '&:last-child td': { border: 0 } }}
                            >
                                {/* Аватар / превью */}
                                <TableCell>
                                    {row.single_thumb ? (
                                        <Avatar
                                            src={row.single_thumb}
                                            variant="rounded"
                                            sx={{ width: 36, height: 36 }}
                                        />
                                    ) : (
                                        <Avatar
                                            variant="rounded"
                                            sx={{
                                                width: 36, height: 36,
                                                bgcolor: 'grey.200', color: 'text.secondary',
                                                fontSize: '0.8rem', fontWeight: 600,
                                            }}
                                        >
                                            {row.name?.charAt(0)?.toUpperCase() ?? 'P'}
                                        </Avatar>
                                    )}
                                </TableCell>

                                {/* Название + отступ по уровню */}
                                <TableCell
                                    onClick={() => openEdit(row.id)}
                                    sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                                >
                                    <Box sx={{ pl: row.depth * 2 }}>
                                        <Typography variant="body2" fontWeight={500} noWrap>
                                            {row.depth > 0 && (
                                                <Box component="span" sx={{ color: 'text.disabled', mr: 0.5 }}>
                                                    {'└ '}
                                                </Box>
                                            )}
                                            {row.name}
                                        </Typography>
                                    </Box>
                                </TableCell>

                                {/* URL / slug */}
                                <TableCell>
                                    {row.url ? (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            component="a"
                                            href={row.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{
                                                display: 'inline-flex', alignItems: 'center', gap: 0.25,
                                                color: 'text.secondary', textDecoration: 'none',
                                                '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                                            }}
                                        >
                                            {row.url}
                                            <OpenInNewIcon sx={{ fontSize: 11 }} />
                                        </Typography>
                                    ) : (
                                        <Typography variant="caption" color="text.disabled">—</Typography>
                                    )}
                                </TableCell>

                                {/* Статус */}
                                <TableCell>
                                    <Chip
                                        label={row.published ? 'Активна' : 'Черновик'}
                                        size="small"
                                        color={row.published ? 'success' : 'default'}
                                        variant="outlined"
                                    />
                                </TableCell>

                                {/* Индикаторы меню */}
                                <TableCell>
                                    <MenuDots row={row} />
                                </TableCell>

                                {/* Действия */}
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 0.25 }}>
                                        {/* Создать дочернюю */}
                                        <Tooltip title="Создать вложенную">
                                            <IconButton
                                                size="small"
                                                onClick={() => openCreate(row.id)}
                                            >
                                                <AddIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>

                                        {/* Редактировать */}
                                        <Tooltip title="Редактировать">
                                            <IconButton
                                                size="small"
                                                onClick={() => openEdit(row.id)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>

                                        {/* Переключить публикацию */}
                                        <Tooltip title={row.published ? 'Снять с публикации' : 'Опубликовать'}>
                                            <IconButton
                                                size="small"
                                                color={row.published ? 'success' : 'default'}
                                                onClick={() => togglePublished(row.id)}
                                            >
                                                {row.published
                                                    ? <VisibilityIcon fontSize="small" />
                                                    : <VisibilityOffIcon fontSize="small" />
                                                }
                                            </IconButton>
                                        </Tooltip>

                                        {/* Удалить */}
                                        <Tooltip title="Удалить">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => deletePage(row.id, row.name)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ── Пагинация ── */}
            <TablePagination
                component="div"
                count={pages.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage="На странице:"
                labelDisplayedRows={({ from, to, count }) =>
                    `${from}–${to} из ${count !== -1 ? count : `более ${to}`}`
                }
            />
        </Paper>
    );
}

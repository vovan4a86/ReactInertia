import React, { useState, useEffect } from 'react';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TableSortLabel,
    Paper,
    Typography,
    IconButton,
    Chip,
    Avatar,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
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
const headCells = [
    { id: 'image', label: 'Изображение', sortable: false },
    { id: 'name', label: 'Название', sortable: true },
    { id: 'parent', label: 'Родитель', sortable: true },
    { id: 'published', label: 'Статус', sortable: true },
    { id: 'created_at', label: 'Создана', sortable: true },
    { id: 'actions', label: 'Действия', sortable: false },
];

const PagesList = ({
    pages = [],
    loading = false,
    error = null,
    onEdit,
    onDelete,
    onCreateChild
                   }) => {
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('name');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    }

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    }

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }

    // Сортировка данных
    const sortedPages = React.useMemo(
        () => [...pages].sort(getComparator(order, orderBy)),
        [pages, order, orderBy],
    )

    // Пагинация
    const paginatedPages = React.useMemo(
        () => sortedPages.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [...sortedPages, page, rowsPerPage],
    );

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!pages || pages.length === 0) {
        return (
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 400,
                flexDirection: 'column',
                gap: 2
            }}>
                <Typography color="text.secondary" variant="h6">
                    Нет страниц
                </Typography>
                <Typography color="text.secondary">
                    Создайте первую страницу, используя кнопку "Добавить страницу" в панели дерева
                </Typography>
            </Box>
        );
    }

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 250px)' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {headCells.map((headCell) => (
                                <TableCell
                                    key={headCell.id}
                                    sortDirection={orderBy === headCell.id ? order : false}
                                    sx={{
                                        fontWeight: 'bold',
                                        backgroundColor: 'background.paper',
                                    }}
                                >
                                    {headCell.sortable ? (
                                        <TableSortLabel
                                            active={orderBy === headCell.id}
                                            direction={orderBy === headCell.id ? order : 'asc'}
                                            onClick={(event) => handleRequestSort(event, headCell.id)}
                                        >
                                            {headCell.label}
                                            {orderBy === headCell.id ? (
                                                <Box component="span" sx={visuallyHidden}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null}
                                        </TableSortLabel>
                                    ) : (
                                        headCell.label
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedPages.map((page) => (
                            <TableRow
                                key={page.id}
                                sx={{
                                    cursor: 'pointer',
                                    '&:last-child td, &:last-child th': { border: 0 }
                                }}
                            >
                                {/* Изображение */}
                                <TableCell sx={{ width: 60 }}>
                                    {page.image ? (
                                        <Avatar
                                            src={page.single_thumb}
                                            variant="rounded"
                                            sx={{ width: 40, height: 40 }}
                                        />
                                    ) : (
                                        <Avatar
                                            variant="rounded"
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                bgcolor: 'grey.200',
                                                color: 'grey.500',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            {page.title?.charAt(0)?.toUpperCase() || 'P'}
                                        </Avatar>
                                    )}
                                </TableCell>

                                {/* Название */}
                                <TableCell
                                    onClick={() => onEdit(page)}
                                    sx={{
                                        '&:hover': {
                                            textDecoration: 'underline',
                                            color: 'primary.main'
                                        }
                                    }}
                                >
                                    <Typography variant="body2" fontWeight="medium">
                                        {page.name}
                                    </Typography>
                                    {page.alias && (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            /{page.alias === '/' ? '' : page.alias}
                                        </Typography>
                                    )}
                                </TableCell>

                                {/* Родитель */}
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {page.parent?.name || '—'}
                                    </Typography>
                                </TableCell>

                                {/* Статус */}
                                <TableCell>
                                    <Chip
                                        label={page.published ? 'Активна' : 'Черновик'}
                                        size="small"
                                        color={page.published ? 'success' : 'warning'}
                                        variant="outlined"
                                    />
                                </TableCell>

                                {/* Дата создания */}
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {new Date(page.created_at).toLocaleDateString('ru-RU', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </Typography>
                                </TableCell>

                                {/* Действия */}
                                <TableCell>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 0.5,
                                            transition: 'opacity 0.2s ease',
                                        }}
                                    >
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCreateChild(page.id);
                                            }}
                                            title="Добавить дочернюю страницу"
                                        >
                                            <AddIcon fontSize="small" />
                                        </IconButton>

                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(page);
                                            }}
                                            title="Редактировать страницу"
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>

                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(page.id);
                                            }}
                                            color="error"
                                            title="Удалить страницу"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={pages.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Строк на странице:"
                labelDisplayedRows={({ from, to, count }) =>
                    `${from}-${to} из ${count !== -1 ? count : `более ${to}`}`
                }
            />
        </Paper>
    );
}

export default PagesList;

import React, { useState, useEffect, useMemo } from 'react';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

// ================================================
// 📌 MUI Components
// ================================================
import {
    Box,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TableSortLabel,
    Toolbar,
    Typography,
    Paper,
    Checkbox,
    IconButton,
    Tooltip,
    Avatar,
    Chip,
    TextField,
    InputAdornment,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    LinearProgress,
} from '@mui/material';

import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    Add as AddIcon,
    Search as SearchIcon,
    Download as DownloadIcon,
    Info as InfoIcon,
    PersonAdd as PersonAddIcon,
    FilterList as FilterListIcon,
} from '@mui/icons-material';

// ================================================
// 📌 Кастомные компоненты админки
// ================================================
import AdminLayout from '@admin-layouts/AdminLayout';
import Widget from '@admin-components/Widget/Widget.jsx';

// ================================================
// 📌 Стили
// ================================================
import useStyles from './styles';

// ================================================
// 📌 КОНСТАНТЫ
// ================================================

/**
 * Заголовки колонок таблицы
 */
const headCells = [
    { id: 'id', numeric: true, disablePadding: true, label: 'ID', sortable: true },
    { id: 'name', numeric: false, disablePadding: false, label: 'ИМЯ', sortable: true },
    { id: 'role', numeric: false, disablePadding: false, label: 'РОЛЬ', sortable: true },
    { id: 'company_name', numeric: false, disablePadding: false, label: 'КОМПАНИЯ', sortable: true },
    { id: 'email', numeric: false, disablePadding: false, label: 'EMAIL', sortable: true },
    { id: 'is_active', numeric: false, disablePadding: false, label: 'СТАТУС', sortable: true },
    { id: 'created_at', numeric: false, disablePadding: false, label: 'СОЗДАНО', sortable: true },
    { id: 'actions', numeric: false, disablePadding: false, label: 'ДЕЙСТВИЯ', sortable: false },
];

// ================================================
// 📌 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ================================================

/**
 * Компаратор для сортировки по убыванию
 */
function descendingComparator(a, b, orderBy) {
    const aValue = a[orderBy] ?? '';
    const bValue = b[orderBy] ?? '';

    if (bValue < aValue) return -1;
    if (bValue > aValue) return 1;
    return 0;
}

/**
 * Получить функцию сравнения в зависимости от направления сортировки
 */
function getComparator(order, orderBy) {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

/**
 * Стабильная сортировка массива
 */
function stableSort(array, comparator) {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}

// ================================================
// 📌 КОМПОНЕНТ EnhancedTableHead (Заголовок таблицы)
// ================================================

function EnhancedTableHead(props) {
    const {
        onSelectAllClick,
        order,
        orderBy,
        numSelected,
        rowCount,
        onRequestSort,
    } = props;

    /**
     * Создает обработчик сортировки для колонки
     */
    const createSortHandler = (property) => (event) => {
        onRequestSort(event, property);
    };

    return (
        <TableHead>
            <TableRow>
                {/* Чекбокс "Выбрать все" */}
                <TableCell padding="checkbox">
                    <Checkbox
                        color="primary"
                        indeterminate={numSelected > 0 && numSelected < rowCount}
                        checked={rowCount > 0 && numSelected === rowCount}
                        onChange={onSelectAllClick}
                        inputProps={{ 'aria-label': 'Выбрать всех пользователей' }}
                    />
                </TableCell>

                {/* Заголовки колонок */}
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'left' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        {headCell.sortable ? (
                            <TableSortLabel
                                active={orderBy === headCell.id}
                                direction={orderBy === headCell.id ? order : 'asc'}
                                onClick={createSortHandler(headCell.id)}
                            >
                                <Typography noWrap fontWeight="medium" variant="body2">
                                    {headCell.label}
                                </Typography>
                            </TableSortLabel>
                        ) : (
                            <Typography noWrap fontWeight="medium" variant="body2">
                                {headCell.label}
                            </Typography>
                        )}
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}

// ================================================
// 📌 КОМПОНЕНТ UserList
// ================================================

export default function UserList() {
    const classes = useStyles();

    // ================================================
    // 📌 ПОЛУЧЕНИЕ ДАННЫХ ИЗ INERTIA
    // ================================================
    // Данные передаются из Laravel контроллера через Inertia::render()
    const { users, filters, flash } = usePage().props;

    // ================================================
    // 📌 СОСТОЯНИЕ ТАБЛИЦЫ
    // ================================================
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('created_at');
    const [selected, setSelected] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [dense, setDense] = useState(false);

    // ================================================
    // 📌 СОСТОЯНИЕ ПОИСКА
    // ================================================
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');

    // ================================================
    // 📌 СОСТОЯНИЕ МОДАЛЬНОГО ОКНА УДАЛЕНИЯ
    // ================================================
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ================================================
    // 📌 ДАННЫЕ ПОЛЬЗОВАТЕЛЕЙ (из пропсов Inertia)
    // ================================================
    const usersRows = useMemo(() => {
        if (!users?.data) return [];

        // Преобразуем данные из Laravel в формат для таблицы
        return users.data.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            country: user.country,
            city: user.city,
            companyName: user.company_name,
            companyEmail: user.company_email,
            companyPhone: user.company_phone,
            avatar: user.avatar,
            isActive: user.is_active,
            emailVerified: user.email_verified_at !== null,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
        }));
    }, [users]);

    // ================================================
    // 📌 ФИЛЬТРАЦИЯ ПО ПОИСКУ
    // ================================================
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return usersRows;

        const searchLower = searchTerm.toLowerCase();
        return usersRows.filter((user) => {
            return (
                user.name?.toLowerCase().includes(searchLower) ||
                user.email?.toLowerCase().includes(searchLower) ||
                user.role?.toLowerCase().includes(searchLower) ||
                user.companyName?.toLowerCase().includes(searchLower) ||
                user.phone?.toLowerCase().includes(searchLower)
            );
        });
    }, [usersRows, searchTerm]);

    // ================================================
    // 📌 Flash-сообщения из Laravel
    // ================================================
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    // ================================================
    // 📌 ОБРАБОТЧИКИ СОБЫТИЙ
    // ================================================

    /**
     * Обработчик сортировки
     */
    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    /**
     * Обработчик "Выбрать все"
     */
    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = filteredUsers.map((user) => user.id);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

    /**
     * Обработчик выбора строки
     */
    const handleClick = (event, userId) => {
        const selectedIndex = selected.indexOf(userId);
        let newSelected = [];

        if (selectedIndex === -1) {
            // Добавить в выбранные
            newSelected = newSelected.concat(selected, userId);
        } else if (selectedIndex === 0) {
            // Удалить первый
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            // Удалить последний
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            // Удалить из середины
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1)
            );
        }

        setSelected(newSelected);
    };

    /**
     * Обработчик смены страницы
     */
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    /**
     * Обработчик изменения количества строк на странице
     */
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    /**
     * Обработчик поиска
     */
    const handleSearch = (event) => {
        const value = event.target.value;
        setSearchTerm(value);
        setPage(0); // Сбрасываем на первую страницу при поиске
    };

    /**
     * Проверка, выбрана ли строка
     */
    const isSelected = (userId) => selected.indexOf(userId) !== -1;

    // ================================================
    // 📌 CRUD ОПЕРАЦИИ
    // ================================================

    /**
     * Открыть модальное окно удаления
     */
    const openDeleteModal = (userId) => {
        setUserToDelete(userId);
        setDeleteModalOpen(true);
    };

    /**
     * Закрыть модальное окно удаления
     */
    const closeDeleteModal = () => {
        setDeleteModalOpen(false);
        setUserToDelete(null);
    };

    /**
     * Удаление пользователя
     */
    const handleDelete = () => {
        if (!userToDelete) return;

        setDeleting(true);

        // Отправляем DELETE запрос через Inertia
        router.delete(`/admin/users/${userToDelete}`, {
            onSuccess: () => {
                toast.success('Пользователь успешно удален!');
                closeDeleteModal();
                setSelected(selected.filter((id) => id !== userToDelete));
            },
            onError: (errors) => {
                toast.error(errors.message || 'Ошибка при удалении пользователя');
                closeDeleteModal();
            },
            onFinish: () => {
                setDeleting(false);
            },
        });
    };

    /**
     * Переход к редактированию пользователя
     */
    const handleEdit = (userId) => {
        router.visit(`/admin/users/${userId}/edit`);
    };

    /**
     * Переход к просмотру пользователя
     */
    const handleView = (userId) => {
        router.visit(`/admin/users/${userId}`);
    };

    /**
     * Переход к созданию пользователя
     */
    const handleAdd = () => {
        router.visit('/admin/users/create');
    };

    /**
     * Экспорт данных (заглушка)
     */
    const handleExport = () => {
        toast.info('Функция экспорта будет доступна позже');
        // В будущем: window.location.href = '/admin/users/export';
    };

    /**
     * Массовое удаление выбранных пользователей
     */
    const handleBulkDelete = () => {
        if (selected.length === 0) {
            toast.warning('Выберите пользователей для удаления');
            return;
        }

        if (window.confirm(`Удалить ${selected.length} пользователей?`)) {
            router.delete('/admin/users/bulk-delete', {
                data: { ids: selected },
                onSuccess: () => {
                    toast.success(`Удалено ${selected.length} пользователей`);
                    setSelected([]);
                },
                onError: (errors) => {
                    toast.error(errors.message || 'Ошибка при удалении');
                },
            });
        }
    };

    // ================================================
    // 📌 ВЫЧИСЛЕНИЯ ДЛЯ ТАБЛИЦЫ
    // ================================================

    // Сортировка и пагинация
    const sortedUsers = useMemo(
        () => stableSort(filteredUsers, getComparator(order, orderBy)),
        [filteredUsers, order, orderBy]
    );

    const paginatedUsers = useMemo(
        () =>
            sortedUsers.slice(
                page * rowsPerPage,
                page * rowsPerPage + rowsPerPage
            ),
        [sortedUsers, page, rowsPerPage]
    );

    const emptyRows =
        page > 0
            ? Math.max(0, (1 + page) * rowsPerPage - filteredUsers.length)
            : 0;

    // ================================================
    // 📌 РЕНДЕР КОМПОНЕНТА
    // ================================================

    return (
        <AdminLayout title="Управление пользователями">
            <Grid container spacing={3}>
                {/* ================================================ */}
                {/* Модальное окно удаления */}
                {/* ================================================ */}
                <Dialog
                    open={deleteModalOpen}
                    onClose={closeDeleteModal}
                    aria-labelledby="delete-dialog-title"
                    aria-describedby="delete-dialog-description"
                >
                    <DialogTitle id="delete-dialog-title">
                        Подтверждение удаления
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="delete-dialog-description">
                            Вы уверены, что хотите удалить этого пользователя?
                            Это действие нельзя будет отменить.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={closeDeleteModal}
                            color="primary"
                            disabled={deleting}
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleDelete}
                            color="error"
                            variant="contained"
                            disabled={deleting}
                            autoFocus
                        >
                            {deleting ? 'Удаление...' : 'Удалить'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* ================================================ */}
                {/* Верхняя панель: поиск и действия */}
                {/* ================================================ */}
                <Grid size={12}>
                    <Widget inheritHeight>
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            flexWrap="wrap"
                            gap={2}
                        >
                            {/* Левая часть: кнопки действий */}
                            <Box display="flex" gap={1} alignItems="center">
                                {/* Кнопка "Добавить пользователя" */}
                                <Button
                                    variant="contained"
                                    color="success"
                                    startIcon={<AddIcon />}
                                    onClick={handleAdd}
                                >
                                    Добавить пользователя
                                </Button>

                                {/* Кнопка "Массовое удаление" */}
                                {selected.length > 0 && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<DeleteIcon />}
                                        onClick={handleBulkDelete}
                                    >
                                        Удалить ({selected.length})
                                    </Button>
                                )}
                            </Box>

                            {/* Правая часть: поиск и экспорт */}
                            <Box display="flex" gap={2} alignItems="center">
                                {/* Поиск */}
                                <TextField
                                    id="search-field"
                                    placeholder="Поиск пользователей..."
                                    variant="outlined"
                                    size="small"
                                    value={searchTerm}
                                    onChange={handleSearch}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ minWidth: 250 }}
                                />

                                {/* Кнопка "Экспорт" */}
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    startIcon={<DownloadIcon />}
                                    onClick={handleExport}
                                >
                                    Экспорт
                                </Button>
                            </Box>
                        </Box>
                    </Widget>
                </Grid>

                {/* ================================================ */}
                {/* Таблица пользователей */}
                {/* ================================================ */}
                <Grid size={12}>
                    <Widget inheritHeight noBodyPadding>
                        <TableContainer>
                            <Table
                                aria-labelledby="tableTitle"
                                size={dense ? 'small' : 'medium'}
                                aria-label="Таблица пользователей"
                            >
                                {/* Заголовок таблицы */}
                                <EnhancedTableHead
                                    numSelected={selected.length}
                                    order={order}
                                    orderBy={orderBy}
                                    onSelectAllClick={handleSelectAllClick}
                                    onRequestSort={handleRequestSort}
                                    rowCount={filteredUsers.length}
                                />

                                {/* Тело таблицы */}
                                <TableBody>
                                    {paginatedUsers.length > 0 ? (
                                        paginatedUsers.map((row, index) => {
                                            const isItemSelected = isSelected(row.id);
                                            const labelId = `enhanced-table-checkbox-${index}`;

                                            return (
                                                <TableRow
                                                    hover
                                                    onClick={(event) =>
                                                        handleClick(event, row.id)
                                                    }
                                                    role="checkbox"
                                                    aria-checked={isItemSelected}
                                                    tabIndex={-1}
                                                    key={row.id}
                                                    selected={isItemSelected}
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    {/* Чекбокс выбора */}
                                                    <TableCell padding="checkbox">
                                                        <Checkbox
                                                            color="primary"
                                                            checked={isItemSelected}
                                                            inputProps={{
                                                                'aria-labelledby': labelId,
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </TableCell>

                                                    {/* ID */}
                                                    <TableCell
                                                        component="th"
                                                        id={labelId}
                                                        scope="row"
                                                        padding="none"
                                                    >
                                                        <Typography variant="body2">
                                                            {row.id}
                                                        </Typography>
                                                    </TableCell>

                                                    {/* Имя с аватаром */}
                                                    <TableCell align="left">
                                                        <Box display="flex" alignItems="center" gap={1.5}>
                                                            <Avatar
                                                                alt={row.name}
                                                                src={row.avatarUrl}
                                                                sx={{
                                                                    width: 32,
                                                                    height: 32,
                                                                    bgcolor: '#536DFE',
                                                                    fontSize: 14,
                                                                }}
                                                            >
                                                                {!row.avatarUrl &&
                                                                    (row.name?.charAt(0)?.toUpperCase() || '?')}
                                                            </Avatar>
                                                            <Box>
                                                                <Typography variant="body2" fontWeight="medium">
                                                                    {row.name}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {row.firstName} {row.lastName}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </TableCell>

                                                    {/* Роль */}
                                                    <TableCell align="left">
                                                        <Chip
                                                            label={row.role === 'admin' ? 'Админ' :
                                                                row.role === 'manager' ? 'Менеджер' : 'Пользователь'}
                                                            size="small"
                                                            color={
                                                                row.role === 'admin'
                                                                    ? 'error'
                                                                    : row.role === 'manager'
                                                                        ? 'warning'
                                                                        : 'primary'
                                                            }
                                                            variant="outlined"
                                                        />
                                                    </TableCell>

                                                    {/* Компания */}
                                                    <TableCell align="left">
                                                        <Typography variant="body2">
                                                            {row.companyName || '—'}
                                                        </Typography>
                                                    </TableCell>

                                                    {/* Email */}
                                                    <TableCell align="left">
                                                        <Typography variant="body2" noWrap>
                                                            {row.email}
                                                        </Typography>
                                                    </TableCell>

                                                    {/* Статус */}
                                                    <TableCell align="left">
                                                        <Chip
                                                            label={row.isActive ? 'Активен' : 'Неактивен'}
                                                            size="small"
                                                            sx={{
                                                                color: '#fff',
                                                                height: 24,
                                                                fontSize: 12,
                                                                fontWeight: 'bold',
                                                                backgroundColor: row.isActive
                                                                    ? '#4CAF50'
                                                                    : '#F44336',
                                                            }}
                                                        />
                                                    </TableCell>

                                                    {/* Дата создания */}
                                                    <TableCell align="left">
                                                        <Typography variant="body2">
                                                            {dayjs(row.createdAt).format('DD.MM.YYYY')}
                                                        </Typography>
                                                    </TableCell>

                                                    {/* Действия */}
                                                    <TableCell align="left">
                                                        <Box display="flex" gap={0.5}>
                                                            {/* Кнопка "Редактировать" */}
                                                            <Tooltip title="Редактировать">
                                                                <IconButton
                                                                    size="small"
                                                                    color="primary"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEdit(row.id);
                                                                    }}
                                                                >
                                                                    <EditIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>

                                                            {/* Кнопка "Просмотр" */}
                                                            <Tooltip title="Просмотр">
                                                                <IconButton
                                                                    size="small"
                                                                    color="info"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleView(row.id);
                                                                    }}
                                                                >
                                                                    <InfoIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>

                                                            {/* Кнопка "Удалить" */}
                                                            <Tooltip title="Удалить">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openDeleteModal(row.id);
                                                                    }}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        /* Нет данных */
                                        <TableRow>
                                            <TableCell colSpan={headCells.length + 1} align="center">
                                                <Box py={4}>
                                                    <Typography variant="body1" color="text.secondary">
                                                        {searchTerm
                                                            ? 'Пользователи не найдены'
                                                            : 'Нет пользователей'}
                                                    </Typography>
                                                    {!searchTerm && (
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<PersonAddIcon />}
                                                            onClick={handleAdd}
                                                            sx={{ mt: 2 }}
                                                        >
                                                            Добавить первого пользователя
                                                        </Button>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {/* Пустые строки для сохранения высоты */}
                                    {emptyRows > 0 && (
                                        <TableRow
                                            style={{
                                                height: (dense ? 33 : 53) * emptyRows,
                                            }}
                                        >
                                            <TableCell colSpan={headCells.length + 1} />
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Пагинация */}
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            component="div"
                            count={filteredUsers.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            labelRowsPerPage="Строк на странице:"
                            labelDisplayedRows={({ from, to, count }) =>
                                `${from}–${to} из ${count !== -1 ? count : `более ${to}`}`
                            }
                        />
                    </Widget>
                </Grid>
            </Grid>
        </AdminLayout>
    );
}

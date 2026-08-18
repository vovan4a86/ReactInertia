import PropTypes from 'prop-types';
import { Link } from '@inertiajs/react';
import {
    Avatar, Box, Checkbox, Chip, IconButton, Link as MuiLink, Paper, Stack,
    Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
    TableRow, TableSortLabel, Tooltip, Typography,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import relativeTime from 'dayjs/plugin/relativeTime';
import ActivityEventChip from './ActivityEventChip.jsx';
import { initials, stringToColor } from './activityMeta.jsx';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const COLUMNS = [
    { id: 'created_at', label: 'Дата и время', sortable: true, width: 180 },
    { id: 'causer_name', label: 'Пользователь', sortable: true, width: 220 },
    { id: 'event', label: 'Событие', sortable: true, width: 190 },
    { id: 'subject', label: 'Объект', sortable: false },
    { id: 'ip', label: 'IP', sortable: false, width: 130 },
    { id: 'actions', label: '', sortable: false, width: 96, align: 'right' },
];

export default function ActivityTable({
                                          logs, meta, filters, selected, onToggle, onToggleAll,
                                          onSort, onPageChange, onPerPageChange, onShow, onDelete,
                                      }) {
    const allChecked = logs.length > 0 && selected.length === logs.length;

    return (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    size="small"
                                    checked={allChecked}
                                    indeterminate={selected.length > 0 && !allChecked}
                                    onChange={(e) => onToggleAll(e.target.checked)}
                                />
                            </TableCell>

                            {COLUMNS.map((col) => (
                                <TableCell key={col.id} align={col.align} sx={{ width: col.width, fontWeight: 700 }}>
                                    {col.sortable ? (
                                        <TableSortLabel
                                            active={filters.sort === col.id}
                                            direction={filters.sort === col.id ? filters.direction : 'desc'}
                                            onClick={() => onSort(col.id)}
                                        >
                                            {col.label}
                                        </TableSortLabel>
                                    ) : col.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {logs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={COLUMNS.length + 1} align="center" sx={{ py: 8 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        🗂️ Записей не найдено — измените параметры фильтрации
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}

                        {logs.map((log) => {
                            const isSelected = selected.includes(log.id);

                            return (
                                <TableRow
                                    key={log.id}
                                    hover
                                    selected={isSelected}
                                    sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                                    onClick={() => onShow(log.id)}
                                >
                                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox size="small" checked={isSelected} onChange={() => onToggle(log.id)} />
                                    </TableCell>

                                    <TableCell>
                                        <Tooltip title={dayjs(log.created_at).format('DD.MM.YYYY HH:mm:ss')} arrow>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {dayjs(log.created_at).format('DD.MM.YYYY HH:mm')}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {dayjs(log.created_at).fromNow()}
                                                </Typography>
                                            </Box>
                                        </Tooltip>
                                    </TableCell>

                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: stringToColor(log.causer.name) }}>
                                                {initials(log.causer.name)}
                                            </Avatar>
                                            <Typography variant="body2" noWrap>{log.causer.name}</Typography>
                                        </Stack>
                                    </TableCell>

                                    <TableCell>
                                        <ActivityEventChip event={log.event} label={log.event_label} />
                                    </TableCell>

                                    <TableCell>
                                        {log.subject ? (
                                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                                <Chip size="small" label={log.subject.title} sx={{ height: 20, fontSize: 11 }} />
                                                {log.subject.link ? (
                                                    <MuiLink
                                                        component={Link}
                                                        href={log.subject.link}
                                                        onClick={(e) => e.stopPropagation()}
                                                        underline="hover"
                                                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 14 }}
                                                    >
                                                        {log.subject.label}
                                                        <OpenInNewIcon sx={{ fontSize: 13 }} />
                                                    </MuiLink>
                                                ) : (
                                                    <Typography variant="body2" color={log.subject.exists ? 'text.primary' : 'text.disabled'}>
                                                        {log.subject.label ?? '—'}
                                                    </Typography>
                                                )}
                                                {log.changes_count > 0 && (
                                                    <Chip size="small" variant="outlined" color="info"
                                                          label={`${log.changes_count} полей`} sx={{ height: 20, fontSize: 11 }} />
                                                )}
                                            </Stack>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">{log.description}</Typography>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                                            {log.ip ?? '—'}
                                        </Typography>
                                    </TableCell>

                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                        <Tooltip title="Подробности">
                                            <IconButton size="small" onClick={() => onShow(log.id)}>
                                                <VisibilityOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Удалить запись">
                                            <IconButton size="small" color="error" onClick={() => onDelete(log.id)}>
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                component="div"
                count={meta.total}
                page={Math.max(meta.current_page - 1, 0)}
                rowsPerPage={meta.per_page}
                rowsPerPageOptions={[15, 25, 50, 100]}
                labelRowsPerPage="Строк на странице:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
                onPageChange={(_, page) => onPageChange(page + 1)}
                onRowsPerPageChange={(e) => onPerPageChange(Number(e.target.value))}
            />
        </Paper>
    );
}

ActivityTable.propTypes = {
    logs: PropTypes.array.isRequired,
    meta: PropTypes.object.isRequired,
    filters: PropTypes.object.isRequired,
    selected: PropTypes.array.isRequired,
    onToggle: PropTypes.func.isRequired,
    onToggleAll: PropTypes.func.isRequired,
    onSort: PropTypes.func.isRequired,
    onPageChange: PropTypes.func.isRequired,
    onPerPageChange: PropTypes.func.isRequired,
    onShow: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};

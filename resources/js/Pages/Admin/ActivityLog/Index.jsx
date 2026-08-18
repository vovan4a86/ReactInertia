import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Deferred, Head, router } from '@inertiajs/react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle, Grid, MenuItem, Paper, Skeleton, Slide, Stack, TextField, Typography,
} from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import { toast } from 'react-toastify';

import AdminLayout from '@admin-layouts/AdminLayout';
import ActivityFilters from '@admin-components/ActivityLog/ActivityFilters.jsx';
import ActivityTable from '@admin-components/ActivityLog/ActivityTable.jsx';
import ActivityStats from '@admin-components/ActivityLog/ActivityStats.jsx';
import ActivityDetailsDrawer from '@admin-components/ActivityLog/ActivityDetailsDrawer.jsx';

export default function Index({ logs, filters, options, selected: selectedLog, stats }) {
    const [selected, setSelected] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [confirm, setConfirm] = useState(null); // { type, id | ids }
    const [pruneDays, setPruneDays] = useState(90);

    const rows = logs.data ?? [];
    const meta = logs.meta ?? {};

    /* ------------------------- навигация / фильтры ------------------------- */

    const visit = useCallback((params, options = {}) => {
        const query = { ...filters, ...params };

        Object.keys(query).forEach((key) => {
            const v = query[key];
            if (v === null || v === '' || (Array.isArray(v) && v.length === 0)) delete query[key];
        });

        router.get(route('admin.activity-log.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['logs', 'filters'],
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            ...options,
        });
    }, [filters]);

    const handleFilterChange = (patch) => { setSelected([]); visit({ ...patch, page: 1 }); };

    const handleReset = () => {
        setSelected([]);
        router.get(route('admin.activity-log.index'), {}, { preserveScroll: true, replace: true });
    };

    const handleRefresh = () => router.reload({ only: ['logs', 'stats'] });

    const handleSort = (column) => {
        const direction = filters.sort === column && filters.direction === 'desc' ? 'asc' : 'desc';
        visit({ sort: column, direction, page: 1 });
    };

    /* ---------------------------- выделение строк --------------------------- */

    const toggleRow = (id) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

    const toggleAll = (checked) => setSelected(checked ? rows.map((r) => r.id) : []);

    /* ------------------------------- детали -------------------------------- */

    const openDetails = (id) => {
        setDetailsOpen(true);
        setDetailsLoading(true);

        router.reload({
            data: { log: id },
            only: ['selected'],
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setDetailsLoading(false),
        });
    };

    /* ------------------------------- действия ------------------------------- */

    const deleteOne = (id) =>
        router.delete(route('admin.activity-log.destroy', id), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => { toast.success('Запись удалена'); setSelected((p) => p.filter((i) => i !== id)); },
            onError: () => toast.error('Не удалось удалить запись'),
            onFinish: () => setConfirm(null),
        });

    const deleteSelected = () =>
        router.post(route('admin.activity-log.bulk-destroy'), { ids: selected }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => { toast.success(`Удалено записей: ${selected.length}`); setSelected([]); },
            onError: () => toast.error('Не удалось удалить записи'),
            onFinish: () => setConfirm(null),
        });

    const prune = () =>
        router.post(route('admin.activity-log.prune'), { days: pruneDays }, {
            preserveScroll: true,
            onSuccess: () => { toast.success('Журнал очищен'); setSelected([]); },
            onError: () => toast.error('Ошибка при очистке журнала'),
            onFinish: () => setConfirm(null),
        });

    const exportCsv = () => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value === null || value === '' ) return;
            if (Array.isArray(value)) value.forEach((v) => params.append(`${key}[]`, v));
            else params.append(key, value);
        });
        window.open(`${route('admin.activity-log.export')}?${params.toString()}`, '_blank');
    };

    /* ------------------------- горячая клавиша Esc ------------------------- */

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && setDetailsOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const confirmText = useMemo(() => ({
        one: 'Удалить выбранную запись журнала? Действие необратимо.',
        bulk: `Удалить выбранные записи (${selected.length})? Действие необратимо.`,
        prune: `Будут удалены все записи старше ${pruneDays} дней. Продолжить?`,
    }), [selected.length, pruneDays]);

    return (
        <AdminLayout title="Журнал активности">
            <Head title="Журнал активности" />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}
                   alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HistoryOutlinedIcon fontSize="large" color="primary" />
                        Журнал активности
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Все важные действия в админ-панели: создание, изменение, удаление и авторизация
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={exportCsv}>
                        Экспорт CSV
                    </Button>
                    <Button variant="outlined" color="error" startIcon={<DeleteSweepOutlinedIcon />}
                            onClick={() => setConfirm('prune')}>
                        Очистка
                    </Button>
                </Stack>
            </Stack>

            {/* 📈 Статистика — приходит отдельным запросом (Inertia defer) */}
            <Deferred
                data="stats"
                fallback={
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        {[0, 1, 2, 3].map((i) => (
                            <Grid key={i} size={{ xs: 6, md: 3 }}>
                                <Skeleton variant="rounded" height={92} sx={{ borderRadius: 3 }} />
                            </Grid>
                        ))}
                        <Grid size={{ xs: 12, lg: 8 }}><Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} /></Grid>
                        <Grid size={{ xs: 12, lg: 4 }}><Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} /></Grid>
                    </Grid>
                }
            >
                {stats ? <ActivityStats stats={stats} /> : null}
            </Deferred>

            <ActivityFilters
                filters={filters}
                options={options}
                processing={processing}
                onChange={handleFilterChange}
                onReset={handleReset}
                onRefresh={handleRefresh}
            />

            <Slide in={selected.length > 0} direction="down" unmountOnExit>
                <Paper variant="outlined"
                       sx={{ p: 1.5, mb: 2, borderRadius: 3, bgcolor: 'action.hover' }}>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                        <Typography variant="body2" fontWeight={600}>
                            Выбрано записей: {selected.length}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Button size="small" color="inherit" onClick={() => setSelected([])}>Снять выделение</Button>
                            <Button size="small" color="error" variant="contained"
                                    startIcon={<DeleteSweepOutlinedIcon />} onClick={() => setConfirm('bulk')}>
                                Удалить
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            </Slide>

            <ActivityTable
                logs={rows}
                meta={meta}
                filters={filters}
                selected={selected}
                onToggle={toggleRow}
                onToggleAll={toggleAll}
                onSort={handleSort}
                onPageChange={(page) => visit({ page })}
                onPerPageChange={(perPage) => visit({ per_page: perPage, page: 1 })}
                onShow={openDetails}
                onDelete={(id) => setConfirm({ type: 'one', id })}
            />

            <ActivityDetailsDrawer
                open={detailsOpen}
                loading={detailsLoading}
                log={selectedLog}
                onClose={() => setDetailsOpen(false)}
            />

            {/* Диалог подтверждения */}
            <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight={700}>Подтверждение</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        {typeof confirm === 'object' ? confirmText.one : confirmText[confirm] ?? ''}
                    </DialogContentText>

                    {confirm === 'prune' && (
                        <TextField
                            select fullWidth size="small" label="Удалить записи старше"
                            value={pruneDays} onChange={(e) => setPruneDays(Number(e.target.value))}
                        >
                            <MenuItem value={30}>30 дней</MenuItem>
                            <MenuItem value={90}>90 дней</MenuItem>
                            <MenuItem value={180}>180 дней</MenuItem>
                            <MenuItem value={365}>1 года</MenuItem>
                            <MenuItem value={0}>Удалить всё</MenuItem>
                        </TextField>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button color="inherit" onClick={() => setConfirm(null)}>Отмена</Button>
                    <Button
                        variant="contained" color="error"
                        onClick={() => {
                            if (typeof confirm === 'object') deleteOne(confirm.id);
                            else if (confirm === 'bulk') deleteSelected();
                            else prune();
                        }}
                    >
                        Удалить
                    </Button>
                </DialogActions>
            </Dialog>
        </AdminLayout>
    );
}

Index.propTypes = {
    logs: PropTypes.object.isRequired,
    filters: PropTypes.object.isRequired,
    options: PropTypes.object.isRequired,
    selected: PropTypes.object,
    stats: PropTypes.object,
};

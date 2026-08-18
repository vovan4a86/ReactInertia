import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
    Autocomplete, Box, Button, Chip, Collapse, Grid, IconButton,
    InputAdornment, MenuItem, Paper, Stack, TextField, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import RefreshIcon from '@mui/icons-material/Refresh';

export default function ActivityFilters({ filters, options, onChange, onReset, onRefresh, processing }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [open, setOpen] = useState(
        Boolean(filters.subject_type || filters.causer_id || filters.date_from || filters.date_to || filters.event?.length),
    );

    // debounce поиска
    useEffect(() => {
        if ((filters.search ?? '') === search) return undefined;
        const timer = setTimeout(() => onChange({ search: search || null }), 400);
        return () => clearTimeout(timer);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => setSearch(filters.search ?? ''), [filters.search]);

    const activeCount = [
        filters.subject_type, filters.causer_id, filters.date_from, filters.date_to,
        filters.event?.length ? filters.event : null,
    ].filter(Boolean).length;

    const selectedEvents = options.events.filter((e) => (filters.event ?? []).includes(e.value));

    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Поиск по описанию, объекту, пользователю, IP…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                />

                <Stack direction="row" spacing={1} flexShrink={0}>
                    <Button
                        variant={open ? 'contained' : 'outlined'}
                        startIcon={<TuneIcon />}
                        onClick={() => setOpen((v) => !v)}
                    >
                        Фильтры
                        {activeCount > 0 && <Chip size="small" label={activeCount} sx={{ ml: 1, height: 20 }} />}
                    </Button>

                    <Tooltip title="Обновить">
                        <span>
                            <IconButton onClick={onRefresh} disabled={processing}>
                                <RefreshIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
            </Stack>

            <Collapse in={open} unmountOnExit>
                <Box sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Autocomplete
                                multiple
                                size="small"
                                options={options.events}
                                value={selectedEvents}
                                getOptionLabel={(o) => o.label}
                                isOptionEqualToValue={(o, v) => o.value === v.value}
                                onChange={(_, value) => onChange({ event: value.map((v) => v.value) })}
                                renderInput={(params) => <TextField {...params} label="Тип события" />}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField
                                select fullWidth size="small" label="Раздел"
                                value={filters.subject_type ?? ''}
                                onChange={(e) => onChange({ subject_type: e.target.value || null })}
                            >
                                <MenuItem value="">Все разделы</MenuItem>
                                {options.subjects.map((s) => (
                                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, md: 5 }}>
                            <Autocomplete
                                size="small"
                                options={options.causers}
                                value={options.causers.find((c) => c.value === filters.causer_id) ?? null}
                                getOptionLabel={(o) => `${o.label}${o.email ? ` · ${o.email}` : ''}`}
                                isOptionEqualToValue={(o, v) => o.value === v.value}
                                onChange={(_, value) => onChange({ causer_id: value?.value ?? null })}
                                renderInput={(params) => <TextField {...params} label="Пользователь" />}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <TextField
                                fullWidth size="small" type="date" label="Дата с"
                                value={filters.date_from ?? ''}
                                onChange={(e) => onChange({ date_from: e.target.value || null })}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <TextField
                                fullWidth size="small" type="date" label="Дата по"
                                value={filters.date_to ?? ''}
                                onChange={(e) => onChange({ date_to: e.target.value || null })}
                                slotProps={{ inputLabel: { shrink: true } }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
                            <Button color="inherit" startIcon={<ClearAllIcon />} onClick={onReset} disabled={!activeCount && !filters.search}>
                                Сбросить фильтры
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Collapse>
        </Paper>
    );
}

ActivityFilters.propTypes = {
    filters: PropTypes.object.isRequired,
    options: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
    onRefresh: PropTypes.func.isRequired,
    processing: PropTypes.bool,
};

import PropTypes from 'prop-types';
import { Card, CardContent, Grid, Paper, Stack, Typography, useTheme } from '@mui/material';
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const StatCard = ({ label, value, emoji }) => (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
        <CardContent>
            <Typography variant="caption" color="text.secondary">{emoji} {label}</Typography>
            <Typography variant="h5" fontWeight={800}>{value?.toLocaleString('ru-RU') ?? 0}</Typography>
        </CardContent>
    </Card>
);

StatCard.propTypes = { label: PropTypes.string, value: PropTypes.number, emoji: PropTypes.string };

export default function ActivityStats({ stats }) {
    const theme = useTheme();

    return (
        <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 3 }}><StatCard emoji="📦" label="Всего записей" value={stats.total} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><StatCard emoji="📅" label="Сегодня" value={stats.today} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><StatCard emoji="🗓️" label="За неделю" value={stats.week} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><StatCard emoji="👥" label="Активных авторов" value={stats.actors} /></Grid>

            <Grid size={{ xs: 12, lg: 8 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: 280 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                        Активность за 30 дней
                    </Typography>
                    <ResponsiveContainer width="100%" height="88%">
                        <AreaChart data={stats.timeline}>
                            <defs>
                                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.45} />
                                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={3} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
                            <Tooltip
                                contentStyle={{ borderRadius: 12, border: `1px solid ${theme.palette.divider}` }}
                                formatter={(v) => [v, 'Событий']}
                            />
                            <Area type="monotone" dataKey="total" stroke={theme.palette.primary.main}
                                  strokeWidth={2} fill="url(#actGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: 280 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                        Топ событий
                    </Typography>
                    <ResponsiveContainer width="100%" height="88%">
                        <BarChart data={stats.byEvent.slice(0, 6)} layout="vertical" margin={{ left: 24 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={110} />
                            <Tooltip formatter={(v) => [v, 'Событий']} contentStyle={{ borderRadius: 12 }} />
                            <Bar dataKey="total" radius={[0, 6, 6, 0]} fill={theme.palette.secondary.main} barSize={16} />
                        </BarChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid>
        </Grid>
    );
}

ActivityStats.propTypes = { stats: PropTypes.object.isRequired };

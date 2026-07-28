import AdminLayout from '@admin-layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import {
    People as PeopleIcon,
} from '@mui/icons-material';

export default function AdminDashboard({ stats }) {
    const cards = [
        { title: 'Total Users', value: stats?.users || 0, icon: <PeopleIcon />, color: '#1976d2' },
    ];

    return (
        <AdminLayout header="Dashboard">
            <Head title="Admin Dashboard" />

            <Grid container spacing={3}>
                {cards.map((card) => (
                    <Grid item xs={12} sm={6} md={3} key={card.title}>
                        <Paper
                            sx={{
                                p: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                            }}
                        >
                            <Box
                                sx={{
                                    backgroundColor: card.color,
                                    borderRadius: '50%',
                                    p: 1,
                                    display: 'flex',
                                    color: 'white',
                                }}
                            >
                                {card.icon}
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    {card.title}
                                </Typography>
                                <Typography variant="h6">
                                    {card.value}
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>
                ))}

                <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Recent Activity
                        </Typography>
                        {/* Здесь можно добавить таблицы, графики и т.д. */}
                    </Paper>
                </Grid>
            </Grid>
        </AdminLayout>
    );
}

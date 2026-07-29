import AdminLayout from '@admin-layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { Typography, Paper } from '@mui/material';

export default function Dashboard({ auth }) {
    return (
        <>
            <Head title="Dashboard" />
            <Paper sx={{ p: 2 }}>
                <Typography variant="h4">Dashboard</Typography>
                <Typography>Welcome, {auth.user.name}!</Typography>
                {/* Ваш контент дашборда */}
            </Paper>
        </>
    );
}

// Важно! Назначаем лейаут странице.
Dashboard.layout = (page) => <AdminLayout title="Панель администратора">{page}</AdminLayout>;

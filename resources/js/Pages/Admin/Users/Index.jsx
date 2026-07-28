import AdminLayout from '@admin-layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import {
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';

export default function UsersIndex({ users }) {
    const handleDelete = (userId) => {
        if (confirm('Are you sure?')) {
            // Inertia.delete(`/admin/users/${userId}`);
        }
    };

    return (
        <AdminLayout title="Users Management">
            <Head title="Users" />

            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4">Users</Typography>
                <Button
                    component={Link}
                    href="/admin/users/create"
                    variant="contained"
                    startIcon={<AddIcon />}
                >
                    Add User
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.data.map((user) => (
                            <TableRow key={user.id} hover>
                                <TableCell>{user.id}</TableCell>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.is_admin ? 'Admin' : 'User'}
                                        size="small"
                                        color={user.is_admin ? 'primary' : 'default'}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.email_verified_at ? 'Verified' : 'Unverified'}
                                        size="small"
                                        color={user.email_verified_at ? 'success' : 'warning'}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        component={Link}
                                        href={`/admin/users/${user.id}/edit`}
                                        color="primary"
                                        size="small"
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        onClick={() => handleDelete(user.id)}
                                        color="error"
                                        size="small"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </AdminLayout>
    );
}

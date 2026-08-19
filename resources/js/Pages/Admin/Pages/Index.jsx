import { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AddIcon from '@mui/icons-material/Add';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import AdminLayout from '@admin-layouts/AdminLayout.jsx';
import PageForm from '@admin-pages/Pages/PageForm.jsx';
import PagesList from '@admin-pages/Pages/PagesList.jsx';
import PagesTree from '@admin-pages/Pages/PagesTree.jsx';

/** Разворачивает дерево в плоский список для табличного режима. */
function flatten(nodes, depth = 0, acc = []) {
    for (const node of nodes) {
        acc.push({ ...node, depth });
        if (node.children) flatten(node.children, depth + 1, acc);
    }
    return acc;
}

/**
 * Экран управления страницами: дерево слева, форма справа.
 * Серверные данные НЕ дублируются в useState — единственный источник истины пропсы Inertia.
 */
export default function Index({ tree = [], page = null, parents = [], mode = 'list' }) {
    const { errors } = usePage().props;
    const [view, setView] = useState('tree');

    const flatPages = useMemo(() => flatten(tree), [tree]);

    const startCreate = () => router.get(route('admin.pages.create'), {}, {
        preserveState: true,
        preserveScroll: true,
        only: ['page', 'parents', 'mode'],
    });

    return (
        <AdminLayout title="Страницы">
            <Head title="Страницы" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={600}>Страницы</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Всего: {flatPages.length}
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={view}
                        onChange={(_, next) => next && setView(next)}
                    >
                        <ToggleButton value="tree"><AccountTreeOutlinedIcon fontSize="small" /></ToggleButton>
                        <ToggleButton value="table"><TableRowsOutlinedIcon fontSize="small" /></ToggleButton>
                    </ToggleButtonGroup>

                    <Button variant="contained" startIcon={<AddIcon />} onClick={startCreate}>
                        Добавить
                    </Button>
                </Stack>
            </Stack>

            {errors?.tree && <Alert severity="error" sx={{ mb: 2 }}>{errors.tree}</Alert>}

            {view === 'table' ? (
                <PagesList tree={tree} selectedId={page?.id} />
            ) : (
                <Grid container spacing={2} alignItems="stretch">
                    {/* MUI 7: Grid v2 — `size`, без `item` */}
                    <Grid size={{ xs: 12, md: 4, lg: 3 }}>
                        <Paper variant="outlined" sx={{ p: 1, height: 620, display: 'flex' }}>
                            <PagesTree data={tree} activeId={page?.id} height={560} />
                        </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, md: 8, lg: 9 }}>
                        {page ? (
                            <PageForm
                                key={page.id ?? 'new'}   // сброс формы при смене страницы
                                page={page}
                                parents={parents}
                                mode={mode}
                            />
                        ) : (
                            <Card variant="outlined" sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
                                <CardContent>
                                    <Typography color="text.secondary">
                                        Выберите страницу в дереве или создайте новую.
                                    </Typography>
                                </CardContent>
                            </Card>
                        )}
                    </Grid>
                </Grid>
            )}
        </AdminLayout>
    );
}

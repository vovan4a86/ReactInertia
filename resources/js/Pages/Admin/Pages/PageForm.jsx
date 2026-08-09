import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
    Divider,
    Alert,
    Tabs,
    Tab,
    Paper
} from '@mui/material';
import { Save } from '@mui/icons-material';
import RichTextEditor from "@/Pages/Admin/Settings/Fields/RichTextEditor.jsx";
import FormHelperText from "@mui/material/FormHelperText";

const PageForm = ({ page, parents }) => {
    const [activeTab, setActiveTab] = useState(0);

    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
        title: page.title || '',
        slug: page.slug || '',
        content: page.content || '',
        parent_id: page.parent_id || '',
        is_active: page.is_active !== undefined ? page.is_active : true,
        meta_title: page.meta_title || '',
        meta_description: page.meta_description || '',
        template: page.template || 'default',
    });

    const handleChange = (field) => (event) => {
        setData(field, event.target.value);
    };

    const handleSwitchChange = (event) => {
        setData('is_active', event.target.checked);
    };

    const handleSelectChange = (field) => (event) => {
        setData(field, event.target.value);
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        put(`/admin/api/pages/${page.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                console.log('Page updated successfully');
            },
        });
    };

    const handleTitleChange = (event) => {
        const title = event.target.value;
        setData('title', title);

        if (!data.slug || data.slug === slugify(data.title)) {
            setData('slug', slugify(title));
        }
    };

    const slugify = (text) => {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-');
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                    {page.title}
                </Typography>
                <FormControlLabel
                    control={
                        <Switch
                            checked={data.is_active}
                            onChange={handleSwitchChange}
                            size="small"
                            color="success"
                        />
                    }
                    label={data.is_active ? "Активна" : "Выключена"}
                    labelPlacement="start"
                />
            </Box>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onChange={handleTabChange}
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
            >
                <Tab label="Параметры" />
                <Tab label="Текст" />
            </Tabs>

            {/* Tab Content */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {/* Параметры Tab */}
                {activeTab === 0 && (
                    <Grid container spacing={2} sx={{ pt: 2 }} direction="column">
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Название"
                                value={data.title}
                                onChange={handleTitleChange}
                                error={!!errors.title}
                                helperText={errors.title}
                                required
                                size="small"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Slug"
                                value={data.slug}
                                onChange={handleChange('slug')}
                                error={!!errors.slug}
                                helperText={errors.slug || "Автоматически из названия"}
                                size="small"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Meta Title"
                                value={data.meta_title}
                                onChange={handleChange('meta_title')}
                                error={!!errors.meta_title}
                                helperText={errors.meta_title}
                                size="small"
                                slotProps={{ inputLabel: {shrink: true} }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Meta Description"
                                value={data.meta_description}
                                onChange={handleChange('meta_description')}
                                error={!!errors.meta_description}
                                helperText={errors.meta_description}
                                multiline
                                rows={4}
                                size="small"
                                slotProps={{ inputLabel: {shrink: true} }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth error={!!errors.template} size="small">
                                <InputLabel>Шаблон</InputLabel>
                                <Select
                                    value={data.template}
                                    onChange={handleSelectChange('template')}
                                    label="Шаблон"
                                    variant="outlined"
                                >
                                    <MenuItem value="default">По умолчанию</MenuItem>
                                    <MenuItem value="home">Главная</MenuItem>
                                    <MenuItem value="contact">Контакты</MenuItem>
                                    <MenuItem value="blog">Блог</MenuItem>
                                </Select>
                                {errors.template && (
                                    <Typography color="error" variant="caption">
                                        {errors.template}
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <FormControl fullWidth error={!!errors.parent_id} size="small">
                                <InputLabel>Родительская страница</InputLabel>
                                <Select
                                    value={data.parent_id}
                                    onChange={handleSelectChange('parent_id')}
                                    label="Родительская страница"
                                    variant="outlined"
                                >
                                    <MenuItem value="">Нет (Корневая)</MenuItem>
                                    {parents && parents.map((parent) => (
                                        <MenuItem key={parent.id} value={parent.id}>
                                            {parent.title}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.parent_id && (
                                    <Typography color="error" variant="caption">
                                        {errors.parent_id}
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>
                    </Grid>
                )}

                {/* Контент Tab */}
                {activeTab === 1 && (
                    <Grid container spacing={2} sx={{ pt: 2 }} direction="column">
                        <FormControl fullWidth variant="outlined">
                            <InputLabel shrink>Содержание</InputLabel>
                            <Box
                                sx={{
                                    mt: 1,
                                    '& .MuiInputBase-root': {
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: errors.content ? 'error.main' : 'rgba(0, 0, 0, 0.23)',
                                        '&:hover': {
                                            borderColor: 'text.primary'
                                        }
                                    }
                                }}
                            >
                                {/* Ваш RichEdit компонент */}
                                <RichTextEditor
                                    value={data.content}
                                    onChange={handleChange('content')}
                                />
                            </Box>
                            {errors.content && (
                                <FormHelperText error>{errors.content}</FormHelperText>
                            )}
                        </FormControl>
                    </Grid>
                )}
            </Box>

            {/* Actions - Sticky Bottom */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 2,
                    justifyContent: 'flex-end',
                    pt: 2,
                    mt: 'auto',
                    borderTop: 1,
                    borderColor: 'divider'
                }}
            >
                <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={processing}
                >
                    {processing ? 'Сохранение...' : 'Сохранить'}
                </Button>
            </Box>
        </Box>
    );
};

export default PageForm;

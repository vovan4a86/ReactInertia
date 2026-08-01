// Head — меняем <title> вкладки
// usePage — доступ к общим данным (пропсы, flash-сообщения)
// router — для отправки запросов (аналог fetch/axios, но через Inertia)
import { Head, usePage, router } from "react";

import { useState, useEffect } from 'react';
// useState — локальное состояние компонента (например, открыта ли форма)
// useEffect — побочные эффекты (показать/скрыть flash-сообщение)

import {
    Container, Typography, Button, TextField,
    List, ListItem, ListItemText, Alert, Snackbar, Box
} from '@mui/material';

import AdminLayout from '@admin-layouts/AdminLayout';

export default function ArticlesIndex({ articles }) {
    // --- 1. ДОСТУП К FLASH-СООБЩЕНИЯМ ОТ LARAVEL ---
    // usePage() даёт доступ ко всем Inertia-пропсам, включая flash-сообщения.
    // Это НЕ наш ручной пропс, он прилетает автоматически из сессии Laravel.
    const { flash } = usePage().props;

    // --- 2. ЛОКАЛЬНОЕ СОСТОЯНИЕ: УПРАВЛЕНИЕ ФОРМОЙ (useState) ---
    // formOpen — нужно показать форму или только кнопку «Добавить»?
    const [formOpen, setFormOpen] = useState(false);

    // formData — значения полей ввода. Храним объект в стейте.
    const [formData, setFormData] = useState({title: '', 'content': ''});

    // --- 3. ЛОКАЛЬНОЕ СОСТОЯНИЕ: УПРАВЛЕНИЕ SNACKBAR (useState) ---
    // Мы не хотим вечно висеть Alert, сделаем кастомный Snackbar.
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

    // --- 4. ЭФФЕКТ ДЛЯ FLASH-СООБЩЕНИЙ (useEffect) ---
    // Этот код выполнится после рендера.
    // Если пришло flash-сообщение (успех/ошибка) — покажем Snackbar.
    useEffect(() => {
        if (flash?.success) {
            setSnackbar({ open: true, message: flash.success });
        }
        // Зависимость [flash] — эффект сработает только когда flash изменится.
        // После первого же показа нужно сбросить flash на бэкенде, но в учебных целях ок
    }, [flash])

    // --- 5. ОБРАБОТЧИКИ ФОРМ ---
    // Обновляем конкретное поле в стейте formData
    const handleChange = (e) => {
        const { name, value } = e.target;
        // ...prev — берём предыдущее состояние и меняем одно поле.
        // Это стандартная практика для форм с несколькими полями.
        setFormData({ ...formData, [name]: value });
    }

    // Отправка данных на сервер через Inertia.router
    const handleSubmit = (e) => {
        e.preventDefault();

        // router.post(url, данные, опции)
        // Не используем axios! Inertia сам заберёт ответ и обновит страницу.
        router.post('/admin/articles', formData, {
            onSuccess: () => {
                // Очищаем форму и закрываем её
                setFormData({title: '', content: ''});
                setFormOpen(false);

                // Локальное сообщение (если не хотим ждать flash)
                setSnackbar({ open: true, message: 'Статья добавлена (фронт)' });
            },
            onError: (errors) => {
                // Ошибки валидации Laravel придут сюда автоматически
                console.error(errors);
            }
            // preserveState: false (по умолчанию) — страница полностью перерендерится,
            // что безопасно, но медленно. В реальном проекте лучше true и обновлять список вручную.
        });
    }

    // Удаление статьи
    const handleDelete = (id) => {
        if (!confirm('Удалить статью?')) return;
        // router.delete для REST-запросов
        router.delete(`/admin/articles/${id}`, {
            onSuccess: () => {
                setFormOpen({ open: true, message: 'Статья удалена (фронт)'});
            },
        });
    }

    return (
        <Container maxWidth="md" sx={{ mt:4 }}>
            {/* Head: меняем title во вкладке браузера */}
            <Head title="Упраление статьями" />

            <Typography variant="h4" gutterBottom>
                Статьи
            </Typography>

            {/* Кнопка, открывающая форму */}
            {!formOpen && (
                <Button variant="contained" onClick={() => setFormOpen(true)} sx={{ mb: 2 }}>
                    Добавить статью
                </Button>
            )}

            {/* Условный рендеринг формы */}
            {formOpen && (
                <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4, p: 2, border: '1px solid #ddd', borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>Новая статья</Typography>
                    <TextField
                        sx={{ mb: 2 }}
                        fullWidth
                        label="Заголовок"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                    />

                    <TextField
                        sx={{ mb: 2 }}
                        fullWidth
                        label="Содержание"
                        name="content"
                        value={formData.content}
                        onChange={handleChange}
                        required
                    />
                    <Button type="submit" variant="contained" sx={{ mr: 1 }}>Сохранить</Button>
                    <Button variant="outlined" onClick={() => setFormOpen(false)}>Отмена</Button>
                </Box>
            )}

            {/* Список статей */}
            <List>
                {articles.map((article) => (
                    <ListItem key={article.id} divider secondaryAction={
                        <Button color="error" onClick={() => handleDelete(article.id)}>Удалить</Button>
                    }>
                        <ListItemText primary={article.title} secondary={article.content?.substring(0, 80) + '...'} />
                    </ListItem>
                ))}
            </List>

            {/* Кастомный Snackbar для сообщений */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

        </Container>
    );
}

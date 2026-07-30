import React, { useEffect, useState, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import { Alert, Snackbar, Box } from '@mui/material';

const FlashMessages = () => {
    const { flash } = usePage().props;
    const [queue, setQueue] = useState([]);
    const [currentMessage, setCurrentMessage] = useState(null);
    const [open, setOpen] = useState(false);

    // Добавляем сообщения в очередь
    useEffect(() => {
        const flashMessages = [];

        // Собираем все сообщения
        const types = ['message', 'success', 'error', 'warning', 'info'];
        types.forEach(type => {
            if (flash?.[type]) {
                flashMessages.push({
                    type,
                    message: flash[type],
                    id: Date.now() + Math.random() + type
                });
            }
        });

        if (flashMessages.length > 0) {
            setQueue(prev => [...prev, ...flashMessages]);
        }
    }, [flash]);

    // Обрабатываем очередь - показываем следующее сообщение
    useEffect(() => {
        // Если нет текущего сообщения и есть сообщения в очереди
        if (!currentMessage && queue.length > 0) {
            setCurrentMessage(queue[0]);
            setOpen(true);
            setQueue(prev => prev.slice(1));
        }
    }, [queue, currentMessage]);

    // Закрытие сообщения
    const handleClose = useCallback((event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
        // Даем время на анимацию закрытия
        setTimeout(() => {
            setCurrentMessage(null);
        }, 300);
    }, []);

    // После закрытия анимации показываем следующее сообщение
    const handleExited = useCallback(() => {
        setCurrentMessage(null);
    }, []);

    // Если нет сообщений - ничего не рендерим
    if (!currentMessage) return null;

    return (
        <Box sx={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            maxWidth: 500,
            width: '100%'
        }}>
            <Snackbar
                open={open}
                autoHideDuration={6000}
                onClose={handleClose}
                TransitionProps={{
                    onExited: handleExited,
                    timeout: 300
                }}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                sx={{
                    '& .MuiSnackbar-root': {
                        position: 'static'
                    }
                }}
            >
                <Alert
                    onClose={handleClose}
                    severity={currentMessage.type}
                    variant="filled"
                    sx={{
                        width: '100%',
                        minWidth: 300,
                        boxShadow: (theme) => theme.shadows[3]
                    }}
                >
                    {currentMessage.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default FlashMessages;

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Snackbar, Alert, Box } from '@mui/material';

const LocalNotificationContext = createContext(null);

export const useLocalNotification = () => {
    const context = useContext(LocalNotificationContext);
    if (!context) {
        throw new Error('useLocalNotification must be used within LocalNotificationProvider');
    }
    return context;
};

export const LocalNotificationProvider = ({ children }) => {
    const [queue, setQueue] = useState([]);
    const [currentMessage, setCurrentMessage] = useState(null);
    const [open, setOpen] = useState(false);
    const isProcessing = useRef(false);

    const showMessage = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        setQueue(prev => [...prev, { message, type, id }]);
    }, []);

    // Обрабатываем очередь
    useEffect(() => {
        if (!currentMessage && queue.length > 0 && !isProcessing.current) {
            isProcessing.current = true;
            setCurrentMessage(queue[0]);
            setOpen(true);
            setQueue(prev => prev.slice(1));
        }
    }, [queue, currentMessage]);

    const handleClose = useCallback((event, reason) => {
        if (reason === 'clickaway') return;
        setOpen(false);
    }, []);

    const handleExited = useCallback(() => {
        setCurrentMessage(null);
        isProcessing.current = false;
    }, []);

    return (
        <LocalNotificationContext.Provider value={{ showMessage }}>
            {children}
            {currentMessage && (
                <Box sx={{
                    position: 'fixed',
                    top: 20,
                    right: 20,
                    zIndex: 10000,
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
            )}
        </LocalNotificationContext.Provider>
    );
};

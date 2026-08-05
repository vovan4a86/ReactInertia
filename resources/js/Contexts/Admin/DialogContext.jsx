import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmDialog from '@admin-components/Dialogs/ConfirmDialog.jsx';

const DialogContext = createContext(null);

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within DialogProvider');
    }
    return context;
}

export const DialogProvider = ({ children }) => {
    const [dialogState, setDialogState] = useState({
        open: false,
        title: '',
        message: '',
        confirmText: 'Да',
        cancelText: 'Отмена',
        confirmColor: 'primary',
    });

    const [resolveRef, setResolveRef] = useState(null);

    const confirm = useCallback((options = {}) => {
        return new Promise(resolve => {
            setDialogState({
                open: true,
                title: options.title || 'Подтверждение',
                message: options.message || 'Вы уверены?',
                confirmText: options.confirmText || 'Да',
                cancelText: options.cancelText || 'Отмена',
                confirmColor: options.confirmColor || 'primary',
            });
            setResolveRef(() => resolve);
        });
    }, [])

    const handleConfirm = useCallback(() => {
        setDialogState(prev => ({ ...prev, open: false }));
        if (resolveRef) {
            resolveRef(true);
        }
    }, [resolveRef]);

    const handleCancel = useCallback(() => {
        setDialogState(prev => ({ ...prev, open: false }));
        if (resolveRef) {
            resolveRef(false);
        }
    }, [resolveRef]);

    return (
        <DialogContext.Provider value={{ confirm }}>
            {children}
            <ConfirmDialog
                {...dialogState}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </DialogContext.Provider>
    );
}

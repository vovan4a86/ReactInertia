import React, { createContext, useContext, useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import ModalRenderer from '@admin-components/Modal/ModalRenderer.jsx';

const ModalContext = createContext();

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within ModalProvider');
    }
    return context;
}

export const ModalProvider = ({ children }) => {
    const [modalData, setModalData] = useState(null);

    const openModal = useCallback((url) => {
        // Просто делаем обычный Inertia-переход
        router.get(url, {}, {
            preserveState: false, // Важно! Обновляем страницу
            preserveScroll: true,
        });
    }, []);

    const closeModal = useCallback(() => {
        // Возвращаемся на индекс без модалки
        router.get('/admin/settings', {}, {
            preserveState: false,
            preserveScroll: true,
        });
    }, []);

    const setModalFromProps = useCallback((data) => {
        setModalData(data);
    }, []);

    return (
        <ModalContext.Provider value={{
            modalData,
            openModal,
            closeModal,
            setModalFromProps
        }}>
            {children}
        </ModalContext.Provider>
    );
};


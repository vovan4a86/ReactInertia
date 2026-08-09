import React, { createContext, useContext, useState, useCallback } from 'react';
import { router } from '@inertiajs/react';

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
        // Делаем запрос с preserveState, чтобы не перезагружать страницу
        router.get(url, {}, {
            preserveState: true,  // Сохраняем состояние страницы
            preserveScroll: true,
            onSuccess: (page) => {
                if (page.props.modalData) {
                    setModalData(page.props.modalData);
                }
            },
            onError: (errors) => {
                console.error('Error loading modal:', errors);
            },
        });
    }, []);

    const closeModal = useCallback(() => {
        // Просто очищаем данные модального окна
        setModalData(null);

        // Опционально: обновляем данные страницы (список настроек)
        router.reload({
            only: ['groups', 'activeGroup', 'settings'],
            preserveState: true,
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

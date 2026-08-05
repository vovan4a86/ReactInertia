import React, { Suspense, lazy } from 'react';
import { Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useModal } from '@/Contexts/Admin/ModalContext.jsx';

const componentMap = {
    'Admin/Settings/Edit': lazy(() => import('@admin-pages/Settings/Edit.jsx'))
};

const ModalRenderer = () => {
    const { modalData, closeModal } = useModal();

    if (!modalData?.open) return null;

    const Component = componentMap[modalData.component];

    return (
        <Dialog
            open={true}
            onClose={closeModal}
            maxWidth="md"
            fullWidth
        >
            <DialogContent sx={{ position: 'relative', p: 3 }}>
                <IconButton
                    aria-label="close"
                    onClick={closeModal}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                    }}
                >
                    <CloseIcon />
                </IconButton>

                {Component ? (
                    <Suspense fallback={<div>Загрузка...</div>}>
                        <Component {...modalData.props} />
                    </Suspense>
                ) : (
                    <Typography color="error">
                        Компонент не найден: {modalData.component}
                    </Typography>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ModalRenderer;


import React from 'react';
import { Box, IconButton, Typography, Chip } from '@mui/material';
import { Add, Edit, Delete, DragIndicator } from '@mui/icons-material';

const TreeNode = ({ node, style, dragHandle, onAddChild, onDelete, onSelect }) => {
    // В react-arborist данные узла находятся в node.data
    const data = node.data;

    if (!data) {
        return (
            <Box style={style}>
                <Typography color="error">Нет данных</Typography>
            </Box>
        );
    }

    // Обработчик клика по названию страницы
    const handleTitleClick = (e) => {
        e.stopPropagation();
        // Вызываем select для узла и передаем данные в родительский компонент
        node.select();
        if (onSelect) {
            onSelect([{ id: data.id }]);
        }
    };

    return (
        <Box
            style={style}
            ref={dragHandle} // ВАЖНО: привязываем dragHandle к корневому элементу
            sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1,
                border: '1px solid transparent',
                borderRadius: 1,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                '&.tree-node-row:hover .action-buttons': {
                    opacity: 1
                },
                '&:hover': {
                    backgroundColor: 'action.hover',
                },
                ...(node.isSelected && {
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText',
                    '&:hover': {
                        backgroundColor: 'primary.main',
                    },
                }),
            }}
            className="tree-node-row"
            onClick={handleTitleClick}
        >
            {/* Drag Handle */}
            <Box
                sx={{
                    mr: 0.5,
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 0.5,
                    '&:hover': {
                        opacity: 1
                    }
                }}
            >
                <DragIndicator fontSize="small" />
            </Box>

            {/* Page Title - Clickable for editing */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    minWidth: 0, // Important for text overflow
                }}
                onClick={handleTitleClick}
            >
                <Typography
                    variant="body2"
                    noWrap
                    sx={{
                        '&:hover': {
                            textDecoration: 'underline'
                        }
                    }}
                >
                    {data.title}
                </Typography>

                {!data.is_active && (
                    <Chip
                        label="Черновик"
                        size="small"
                        color="warning"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                )}
            </Box>

            {/* Action Buttons */}
            <Box
                className="action-buttons"
                sx={{
                    display: 'flex',
                    gap: 0.5,
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddChild(data.id);
                    }}
                    title="Добавить страницу"
                >
                    <Add fontSize="small" />
                </IconButton>

                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        node.select();
                        if (onSelect) {
                            onSelect([{ id: data.id }]);
                        }
                    }}
                    title="Редактировать страницу"
                >
                    <Edit fontSize="small" />
                </IconButton>

                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(data.id);
                    }}
                    color="error"
                    title="Удалить страницу"
                >
                    <Delete fontSize="small" />
                </IconButton>
            </Box>
        </Box>
    );
};

export default TreeNode;

import React, {useEffect} from 'react';
import { Box, IconButton, Typography, Chip, Tooltip } from '@mui/material';
import {Add, Edit, Delete, ExpandMore, Folder, FolderOpen, Article} from '@mui/icons-material';

const TreeNode = ({
                      node,
                      style,
                      dragHandle,
                      onAddChild,
                      onDelete,
                      onSelect,
                      onToggleNode,
                  }) => {
    const data = node.data;

    if (!data) {
        return (
            <Box style={style}>
                <Typography color="error">Нет данных</Typography>
            </Box>
        );
    }

    const handleTitleClick = (e) => {
        e.stopPropagation();
        node.select();
        if (onSelect) {
            onSelect([{ id: data.id }]);
        }
    };

    const handleToggle = (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Вызываем toggle
        node.toggle();

        // Уведомляем родителя об изменении
        if (onToggleNode) {
            onToggleNode(data.id, !node.isOpen);
        }
    };

    const hasChildren = node.children && node.children.length > 0;

    const getNodeIcon = () => {
        if (hasChildren) {
            return node.isOpen ? (
                <FolderOpen sx={{ fontSize: 16, color: 'primary.main' }} />
            ) : (
                <Folder sx={{ fontSize: 16, color: 'primary.main' }} />
            );
        }
        return <Article sx={{ fontSize: 16, color: 'text.secondary' }} />;
    };

    return (
        <Box
            style={style}
            ref={dragHandle}
            sx={{
                display: 'flex',
                alignItems: 'center',
                px: 0.75,
                py: 0.25,
                border: '1px solid transparent',
                borderRadius: 1,
                transition: 'all 0.15s ease',
                cursor: 'pointer',
                minHeight: 32,
                '&:hover': {
                    backgroundColor: 'action.hover',
                    '& .action-buttons': {
                        opacity: 1,
                        transform: 'translateX(0)'
                    }
                },
                ...(node.isSelected && {
                    backgroundColor: 'primary.50',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    '&:hover': {
                        backgroundColor: 'primary.100',
                    },
                }),
            }}
            className="tree-node-row"
            onClick={handleTitleClick}
        >
            {/* Toggle Button for expand/collapse */}
            {hasChildren ? (
                <Tooltip title={node.isOpen ? "Свернуть" : "Развернуть"}>
                    <IconButton
                        size="small"
                        onClick={handleToggle}
                        sx={{
                            width: 20,
                            height: 20,
                            mr: 0.25,
                            transform: node.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                            transition: 'transform 0.15s ease',
                            color: 'text.secondary',
                            '&:hover': {
                                color: 'primary.main',
                            }
                        }}
                    >
                        <ExpandMore sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            ) : (
                <Box sx={{ width: 20, mr: 0.25 }} />
            )}

            {/* Node Icon */}
            <Box sx={{
                mr: 0.75,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0
            }}>
                {getNodeIcon()}
            </Box>

            {/* Page Title */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    cursor: 'pointer',
                    minWidth: 0,
                }}
                onClick={handleTitleClick}
            >
                <Typography
                    variant="body2"
                    noWrap
                    sx={{
                        fontSize: '0.875rem',
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
                        variant="outlined"
                        sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            '& .MuiChip-label': {
                                px: 0.5
                            }
                        }}
                    />
                )}
            </Box>

            {/* Action Buttons - компактные и современные */}
            <Box
                className="action-buttons"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                    opacity: 0,
                    transform: 'translateX(-4px)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    ml: 1,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <Tooltip title="Добавить подраздел">
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddChild(data.id);
                        }}
                        sx={{
                            width: 24,
                            height: 24,
                            color: 'text.secondary',
                            '&:hover': {
                                backgroundColor: 'primary.50',
                                color: 'primary.main',
                            }
                        }}
                    >
                        <Add sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Редактировать">
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            node.select();
                            if (onSelect) {
                                onSelect([{ id: data.id }]);
                            }
                        }}
                        sx={{
                            width: 24,
                            height: 24,
                            color: 'text.secondary',
                            '&:hover': {
                                backgroundColor: 'primary.50',
                                color: 'primary.main',
                            }
                        }}
                    >
                        <Edit sx={{ fontSize: 14 }} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Удалить">
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(data.id);
                        }}
                        sx={{
                            width: 24,
                            height: 24,
                            color: 'text.secondary',
                            '&:hover': {
                                backgroundColor: 'error.50',
                                color: 'error.main',
                            }
                        }}
                    >
                        <Delete sx={{ fontSize: 14 }} />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};


export default TreeNode;

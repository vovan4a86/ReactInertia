// resources/js/Pages/Admin/Pages/Index.jsx

import React, {useState, useEffect, useRef} from 'react';
import { router } from '@inertiajs/react';
import { Box, Grid, Paper, Typography, CircularProgress, Button } from '@mui/material';
import { Tree } from 'react-arborist';
import PageForm from './PageForm';
import TreeNode from './TreeNode';
import AdminLayout from "@/Layouts/Admin/AdminLayout.jsx";

const AdminPages = ({ treeData = [] }) => {
    const [selectedPage, setSelectedPage] = useState(null);
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [treeDataState, setTreeDataState] = useState([]);

    const treeContainerRef = useRef(null);
    const [treeHeight, setTreeHeight] = useState(600);


    // Инициализируем данные при загрузке
    useEffect(() => {
        if (treeData && Array.isArray(treeData) && treeData.length > 0) {
            setTreeDataState([...treeData]);
        } else {
            console.error('No tree data received or invalid format:', treeData);
        }
    }, [treeData]);

    // Высота дерева
    useEffect(() => {
        const updateHeight = () => {
            if (treeContainerRef.current) {
                const height = treeContainerRef.current.clientHeight;
                setTreeHeight(height);
            }
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);

        return () => window.removeEventListener('resize', updateHeight);
    }, []);


    const handleSelect = (nodes) => {
        if (nodes.length > 0) {
            const node = nodes[0];
            console.log('Selected node:', node);
            setSelectedPage(node);
            setLoading(true);

            fetch(`/admin/api/pages/${node.id}`)
                .then(response => response.json())
                .then(data => {
                    console.log('Page data loaded:', data);
                    setPageData(data);
                })
                .catch(error => {
                    console.error('Error fetching page:', error);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    };

    const handleMove = ({ dragIds, parentId, index }) => {
        console.log('Move:', { dragIds, parentId, index });

        // Оптимистичное обновление UI
        setTreeDataState(prevData => {
            const newData = JSON.parse(JSON.stringify(prevData));

            let draggedNode = null;

            // Находим и удаляем узел
            const removeNode = (nodes) => {
                const filtered = nodes.filter(node => {
                    if (node.id === dragIds[0]) {
                        draggedNode = { ...node };
                        return false;
                    }
                    return true;
                });

                // Рекурсивно обрабатываем children
                return filtered.map(node => {
                    if (node.children && node.children.length > 0) {
                        return {
                            ...node,
                            children: removeNode(node.children)
                        };
                    }
                    return node;
                });
            };

            let updatedData = removeNode(newData);

            if (!draggedNode) {
                console.warn('Dragged node not found');
                return prevData;
            }

            // Добавляем в новое место
            if (parentId) {
                const addToParent = (nodes) => {
                    return nodes.map(node => {
                        if (node.id === parentId) {
                            return {
                                ...node,
                                children: [...(node.children || []), draggedNode]
                            };
                        }
                        if (node.children && node.children.length > 0) {
                            return {
                                ...node,
                                children: addToParent(node.children)
                            };
                        }
                        return node;
                    });
                };
                updatedData = addToParent(updatedData);
            } else {
                // Добавляем на корневой уровень
                const newIndex = Math.min(index, updatedData.length);
                updatedData.splice(newIndex, 0, draggedNode);
            }

            return updatedData;
        });

        // Отправляем на сервер
        router.put('/admin/api/pages/reorder', {
            id: dragIds[0],
            parent_id: parentId,
            order: index,
        }, {
            preserveScroll: true,
            preserveState: true,
            onError: (errors) => {
                console.error('Reorder error:', errors);
                // Возвращаем исходное состояние
                setTreeDataState([...treeData]);
            },
        });
    };

    const handleCreate = (parentId = null) => {
        router.post('/admin/api/pages', {
            title: 'New Page',
            parent_id: parentId,
            order: 0,
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: (response) => {
                const newPage = response.props.page;
                console.log('Created page:', newPage);

                setTreeDataState(prevData => {
                    const newData = JSON.parse(JSON.stringify(prevData));
                    const newNode = {
                        id: newPage.id,
                        title: newPage.title,
                        slug: newPage.slug,
                        is_active: newPage.is_active,
                        children: []
                    };

                    if (parentId) {
                        const addChild = (nodes) => {
                            return nodes.map(node => {
                                if (node.id === parentId) {
                                    return {
                                        ...node,
                                        children: [...(node.children || []), newNode]
                                    };
                                }
                                if (node.children && node.children.length > 0) {
                                    return {
                                        ...node,
                                        children: addChild(node.children)
                                    };
                                }
                                return node;
                            });
                        };
                        return addChild(newData);
                    } else {
                        return [...newData, newNode];
                    }
                });

                setSelectedPage({ id: newPage.id });
                setPageData({ page: newPage, parents: [] });
            },
            onError: (errors) => {
                console.error('Create error:', errors);
            },
        });
    };

    const handleDelete = (pageId) => {
        if (!confirm('Are you sure you want to delete this page?')) return;

        router.delete(`/admin/api/pages/${pageId}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setTreeDataState(prevData => {
                    const newData = JSON.parse(JSON.stringify(prevData));

                    const removeNode = (nodes) => {
                        return nodes
                            .filter(node => node.id !== pageId)
                            .map(node => {
                                if (node.children && node.children.length > 0) {
                                    return {
                                        ...node,
                                        children: removeNode(node.children)
                                    };
                                }
                                return node;
                            });
                    };

                    return removeNode(newData);
                });

                if (selectedPage?.id === pageId) {
                    setSelectedPage(null);
                    setPageData(null);
                }
            },
        });
    };

    if (treeDataState.length === 0) {
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Box textAlign="center">
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }}>Загрузка дерева...</Typography>
                </Box>
            </Box>
        );
    }

    return (
        <AdminLayout>
            <Box>
                <Typography variant="h4" gutterBottom>
                    Менеджер страниц
                </Typography>

                <Grid container spacing={3} sx={{ height: 'calc(100vh - 150px)', flexWrap: 'nowrap' }}>
                    {/* Tree Panel - Fixed 3 columns */}
                    <Grid
                        item
                        md={3}
                        sx={{
                            height: '100%',
                            width: '25%', // Явно задаем ширину
                            flex: '0 0 25%', // Запрещаем расти и сжиматься
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <Paper
                            sx={{
                                p: 2,
                                height: '100%',
                                overflow: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                width: '100%' // Растягиваем на всю ширину Grid item
                            }}
                        >
                            <Box sx={{ mb: 2, flexShrink: 0 }}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => handleCreate(null)}
                                    fullWidth
                                >
                                    Добавить страницу
                                </Button>
                            </Box>

                            {treeDataState.length > 0 && (
                                <Box sx={{ flex: 1, overflow: 'auto' }}>
                                    <Tree
                                        data={treeDataState}
                                        width="100%"
                                        height={treeHeight}
                                        indent={24}
                                        rowHeight={36}
                                        onMove={handleMove}
                                        onSelect={handleSelect}
                                        selection={selectedPage?.id?.toString()}
                                    >
                                        {(props) => (
                                            <TreeNode
                                                {...props}
                                                onAddChild={handleCreate}
                                                onDelete={handleDelete}
                                                onSelect={handleSelect}
                                            />
                                        )}
                                    </Tree>
                                </Box>
                            )}
                        </Paper>
                    </Grid>

                    {/* Form Panel - Fixed 9 columns */}
                    <Grid
                        item
                        md={9}
                        sx={{
                            height: '100%',
                            width: '75%', // Явно задаем ширину
                            flex: '0 0 75%', // Запрещаем расти и сжиматься
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <Paper
                            sx={{
                                p: 3,
                                height: '100%',
                                overflow: 'auto',
                                width: '100%' // Растягиваем на всю ширину Grid item
                            }}
                        >
                            {loading ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        height: '100%'
                                    }}
                                >
                                    <CircularProgress />
                                </Box>
                            ) : pageData ? (
                                <PageForm
                                    page={pageData.page}
                                    parents={pageData.parents}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        height: '100%'
                                    }}
                                >
                                    <Typography color="text.secondary">
                                        Выберите страницу для редактирования
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </AdminLayout>
    );
};

export default AdminPages;

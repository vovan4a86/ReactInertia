import React, {useState, useEffect, useRef} from 'react';
import { router } from '@inertiajs/react';
import {Box, Grid, Paper, Typography, CircularProgress, Button, Link, Breadcrumbs} from '@mui/material';
import { Tree } from 'react-arborist';
import PageForm from './PageForm';
import TreeNode from './TreeNode';
import PagesList from './PagesList';
import AdminLayout from "@/Layouts/Admin/AdminLayout.jsx";

const AdminPages = ({ treeData = [], pagesData = [] }) => {
    const [selectedPage, setSelectedPage] = useState(null);
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [treeDataState, setTreeDataState] = useState([]);
    const [createKey, setCreateKey] = useState(0); // Добавляем счетчик для ключа

    const [allPages, setAllPages] = useState(pagesData || []);
    const [pagesLoading, setPagesLoading] = useState(false);
    const [pagesError, setPagesError] = useState(null);

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

    // Загрузка всех страниц для списка
    useEffect(() => {
        if (!selectedPage && pagesData && pagesData.length > 0) {
            setAllPages(pagesData);
        } else if (!selectedPage) {
            fetchAllPages();
        }
    }, [selectedPage]);

    const fetchAllPages = async () => {
        setPagesLoading(true);
        setPagesError(null);
        try {
            const response = await fetch('/admin/api/pages');
            if (!response.ok) throw new Error('Failed to fetch pages');
            const data = await response.json();
            setAllPages(data.pages || []);
        } catch (error) {
            console.error('Error fetching all pages:', error);
            setPagesError('Не удалось загрузить список страниц');
        } finally {
            setPagesLoading(false);
        }
    };

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

    const getBreadcrumbs = (page, treeData) => {
        if (!page) return [];

        const breadcrumbs = [];

        const findPath = (nodes, targetId, path = []) => {
            for (const node of nodes) {
                const currentPath = [...path, { id: node.id, title: node.title }];

                if (node.id === targetId) {
                    return currentPath;
                }

                if (node.children && node.children.length > 0) {
                    const found = findPath(node.children, targetId, currentPath);
                    if (found) return found;
                }
            }
            return null;
        };

        const path = findPath(treeData, page.id);
        return path || [{ id: page.id, title: page.title }];
    };

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
                const newIndex = Math.min(index, updatedData.length);
                updatedData.splice(newIndex, 0, draggedNode);
            }

            return updatedData;
        });

        // Отправляем на сервер через POST с _method=PUT
        router.post('/admin/api/pages/reorder', {
            id: dragIds[0],
            parent_id: parentId,
            order: index,
            _method: 'PUT',
        }, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: (page) => {
                console.log('Reorder successful');
                if (page.props.treeData) {
                    setTreeDataState(page.props.treeData);
                }
            },
            onError: (errors) => {
                console.error('Reorder error:', errors);
                setTreeDataState([...treeData]);
            },
        });
    };

    const handleCreate = (parentId = null) => {
        console.log('create:', parentId);

        // Увеличиваем счетчик для создания нового ключа
        const newCreateKey = createKey + 1;
        setCreateKey(newCreateKey);

        // Сначала загружаем список родителей
        fetch('/admin/api/pages/parents')
            .then(response => response.json())
            .then(parentsData => {
                // Создаем новую страницу с правильным parent_id
                const newPage = {
                    id: null,
                    title: '',
                    slug: '',
                    content: '',
                    parent_id: parentId || '',
                    is_active: true,
                    meta_title: '',
                    meta_description: '',
                    template: 'default',
                };

                // Устанавливаем все данные сразу
                setPageData({
                    page: newPage,
                    parents: parentsData.parents || [],
                    isNew: true,
                    createKey: newCreateKey // Добавляем ключ в данные
                });

                // Сбрасываем selectedPage
                setSelectedPage({ id: null, parentId: parentId });
            })
            .catch(error => {
                console.error('Error fetching parents:', error);

                // Даже при ошибке открываем форму
                const newPage = {
                    id: null,
                    title: '',
                    slug: '',
                    content: '',
                    parent_id: parentId || '',
                    is_active: true,
                    meta_title: '',
                    meta_description: '',
                    template: 'default',
                };

                setPageData({
                    page: newPage,
                    parents: [],
                    isNew: true,
                    createKey: newCreateKey
                });

                setSelectedPage({ id: null, parentId: parentId });
            });
    };

    const handleDelete = (pageId) => {
        if (!confirm('Вы уверены что хотите удалить страницу?')) return;

        router.delete(`/admin/api/pages/${pageId}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setTreeDataState(prevData => {
                    const removeNode = (nodes) => {
                        return nodes
                            .filter(node => node.id !== pageId)
                            .map(node => ({
                                ...node,
                                children: node.children ? removeNode(node.children) : []
                            }));
                    };
                    return removeNode([...prevData]);
                });

                // Обновляем список всех страниц
                setAllPages(prevPages => prevPages.filter(p => p.id !== pageId));

                if (selectedPage?.id === pageId) {
                    setSelectedPage(null);
                    setPageData(null);
                }
            },
        });
    };

    // Обработчики для PagesList
    const handleEditFromList = (page) => {
        handleSelect([{ id: page.id }]);
    };

    const handleDeleteFromList = (pageId) => {
        handleDelete(pageId);
    };

    const handleCreateChildFromList = (parentId) => {
        handleCreate(parentId);
    };

    // Функция для обновления allPages после создания/обновления страницы
    const handlePageSaved = () => {
        // Обновляем список всех страниц
        fetchAllPages();
        // Также нужно обновить дерево
        // Это можно сделать через Inertia.reload или перезапросить данные
    };

    // Генерируем ключ для PageForm
    const getFormKey = () => {
        if (pageData?.isNew) {
            return `new-${pageData.createKey || createKey}`;
        }
        return pageData?.page?.id || 'empty';
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
            <Box sx={{ mr: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4">
                        Менеджер страниц
                    </Typography>

                    {selectedPage && (
                        <Breadcrumbs aria-label="breadcrumb">
                            {getBreadcrumbs(selectedPage, treeDataState).map((item, index, arr) => {
                                const isLast = index === arr.length - 1;
                                return isLast ? (
                                    <Typography key={item.id} color="text.primary">
                                        {item.title}
                                    </Typography>
                                ) : (
                                    <Link
                                        key={item.id}
                                        underline="hover"
                                        color="inherit"
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleSelect([{ id: item.id }]);
                                        }}
                                    >
                                        {item.title}
                                    </Link>
                                );
                            })}
                        </Breadcrumbs>
                    )}
                </Box>

                <Grid container spacing={3} sx={{ height: 'calc(100vh - 150px)', flexWrap: 'nowrap' }}>
                    {/* Tree Panel */}
                    <Grid
                        item
                        md={3}
                        sx={{
                            height: '100%',
                            width: '25%',
                            flex: '0 0 25%',
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
                                width: '100%'
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

                    {/* Form Panel */}
                    <Grid
                        item
                        md={9}
                        sx={{
                            height: '100%',
                            width: '75%',
                            flex: '0 0 75%',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <Paper
                            sx={{
                                p: 3,
                                height: '100%',
                                overflow: 'auto',
                                width: '100%'
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
                                    key={getFormKey()}
                                    page={pageData.page}
                                    parents={pageData.parents}
                                    isNew={pageData.isNew || false}
                                    onSaved={handlePageSaved}
                                />
                            ) : (
                                <Box sx={{ height: '100%' }}>
                                    <Typography variant="h6" gutterBottom>
                                        Все страницы
                                    </Typography>
                                    <PagesList
                                        pages={allPages}
                                        loading={pagesLoading}
                                        error={pagesError}
                                        onEdit={handleEditFromList}
                                        onDelete={handleDeleteFromList}
                                        onCreateChild={handleCreateChildFromList}
                                    />
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

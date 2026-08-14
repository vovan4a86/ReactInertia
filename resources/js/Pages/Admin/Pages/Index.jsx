import React, {useState, useEffect, useRef, useCallback} from 'react';
import {router} from '@inertiajs/react';
import {Box, Grid, Paper, Typography, CircularProgress, Button, Link, Breadcrumbs} from '@mui/material';
import {Tree} from 'react-arborist';
import PageForm from './PageForm';
import TreeNode from './TreeNode';
import PagesList from './PagesList';
import AdminLayout from "@/Layouts/Admin/AdminLayout.jsx";

const AdminPages = ({
                        treeData = [],
                        pagesData = [],
                        parents = [],
                        selectedPageData = []
                    }) => {
    const [selectedPage, setSelectedPage] = useState(null);
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [treeDataState, setTreeDataState] = useState([]);
    const [createKey, setCreateKey] = useState(0);
    const [allPages, setAllPages] = useState(pagesData || []);
    const [pagesLoading, setPagesLoading] = useState(false);
    const [pagesError, setPagesError] = useState(null);

    // Состояние для открытых узлов
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const treeRef = useRef(null);

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
        setAllPages(pagesData);
    }, [pagesData]);

    useEffect(() => {
        if (selectedPageData && selectedPageData.length > 0) {
            setPageData(selectedPageData);
            console.log(selectedPageData)
            setSelectedPage({ id: selectedPageData.page.id });
        }
    }, [selectedPageData]);

    // Обработчик изменения состояния узла
    const handleNodeToggle = useCallback((nodeId, isOpen) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (isOpen) {
                newSet.add(nodeId);
            } else {
                newSet.delete(nodeId);
            }
            return newSet;
        });
    }, []);

    // Сохранение открытых узлов перед перемещением
    const saveExpandedNodes = useCallback(() => {
        if (treeRef.current) {
            const openNodes = new Set();
            treeRef.current.visibleNodes.forEach(node => {
                if (node.isOpen && node.children?.length) {
                    openNodes.add(node.data.id);
                }
            });
            setExpandedNodes(openNodes);
        }
    }, []);

    // Восстановление открытых узлов после обновления
    const restoreExpandedNodes = useCallback(() => {
        setTimeout(() => {
            if (treeRef.current) {
                treeRef.current.visibleNodes.forEach(node => {
                    if (expandedNodes.has(node.data.id) && node.children?.length) {
                        node.open();
                    }
                });
            }
        }, 50);
    }, [expandedNodes]);

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
            setSelectedPage(node);

            // Используем Inertia для перехода
            router.get(`/admin/pages/${node.id}`, {}, {
                preserveScroll: true,
                preserveState: false,
            });
        }
    };

    const handleMove = ({ dragIds, parentId, index }) => {
        // Сохраняем состояние открытых узлов
        saveExpandedNodes();

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
        router.post('/admin/pages/reorder', {
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
                // Восстанавливаем открытые узлы
                restoreExpandedNodes();
            },
            onError: (errors) => {
                console.error('Reorder error:', errors);
                setTreeDataState([...treeData]);
                // Восстанавливаем открытые узлы
                restoreExpandedNodes();
            },
        });
    };

    const handleCreate = (parentId = null) => {
        // Увеличиваем счетчик для создания нового ключа
        const newCreateKey = createKey + 1;
        setCreateKey(newCreateKey);

        // Используем parents из props
        const newPage = {
            id: null,
            name: '',
            slug: '',
            text: '',
            parent_id: parentId || '',
            published: true,
            on_main: true,
            on_header_menu: true,
            on_footer_menu: true,
            on_mobile_menu: true,
            title: '',
            keywords: '',
            description: '',
            og_title: '',
            og_description: '',
        };

        setPageData({
            page: newPage,
            parents: parents,
            isNew: true,
            createKey: newCreateKey
        });

        setSelectedPage({ id: null, parentId: parentId });
    };

    const handleDelete = (pageId) => {
        if (!confirm('Вы уверены что хотите удалить страницу?')) return;

        router.delete(`/admin/pages/${pageId}`, {
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
        // После сохранения перезагружаем страницу
        router.reload({
            only: ['treeData', 'pagesData', 'parents'],
            preserveScroll: true,
        });
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

                <Grid container spacing={3} sx={{ flexWrap: 'nowrap' }}>
                    {/* Tree Panel */}
                    <Grid
                        item
                        md={3}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            flex: '0 0 auto',
                            minWidth: '250px',
                            maxWidth: '400px'
                        }}
                    >
                        <Paper
                            sx={{
                                p: 2,
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
                                <Box sx={{ flex: 1 }}>
                                    <Tree
                                        ref={treeRef}
                                        data={treeDataState}
                                        width="100%"
                                        height={600}
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
                                                onToggleNode={handleNodeToggle}
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
                            display: 'flex',
                            flexDirection: 'column',
                            flex: '1 1 auto'
                        }}
                    >
                        <Paper
                            sx={{
                                p: 3,
                                height: '100%',
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
                            ) : selectedPageData && selectedPageData.page ? (
                                <PageForm
                                    key={getFormKey()}
                                    page={selectedPageData.page}
                                    parents={selectedPageData.parents}
                                    isNew={selectedPageData.isNew || false}
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


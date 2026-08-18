import { useCallback, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Tree } from 'react-arborist';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { toast } from 'react-toastify';

import TreeNode from './TreeNode.jsx';
import { TreeContext } from '@/Contexts/Admin/TreeContext.jsx';
import { TREE_METRICS, TreeSurface } from './treeStyles.jsx';

/** Пустой контекстный меню-стейт. */
const NO_MENU = { mouseX: 0, mouseY: 0, node: null };

/**
 * Дерево страниц: компактный вид «под jsTree», drag&drop, поиск,
 * inline-переименование и контекстное меню.
 *
 * @param {Array}         props.data       дерево с бэкенда (Page::tree())
 * @param {string|null}   props.activeId   id открытой страницы
 * @param {number}        props.height     высота области дерева, px
 */
export default function PagesTree({ data, activeId = null, height = 560 }) {
    const treeRef = useRef(null);
    const [search, setSearch] = useState('');
    const [menu, setMenu] = useState(NO_MENU);

    const selection = activeId ? String(activeId) : undefined;

    /** Открыть страницу в панели редактирования (частичная перезагрузка). */
    const openPage = useCallback((id) => {
        router.visit(route('admin.pages.show', id), {
            preserveState: true,   // дерево не размонтируется → раскрытые узлы живы
            preserveScroll: true,
            only: ['page', 'parents', 'mode', 'flash'],
        });
    }, []);

    const handleActivate = useCallback((node) => openPage(node.id), [openPage]);

    const handleContextMenu = useCallback((event, node) => {
        event.preventDefault();
        event.stopPropagation();
        node.focus();
        setMenu({ mouseX: event.clientX, mouseY: event.clientY, node });
    }, []);

    const closeMenu = useCallback(() => setMenu(NO_MENU), []);

    /** Drag&drop: сохраняем новое положение узла. */
    const handleMove = useCallback(({ dragIds, parentId, index }) => {
        router.put(
            route('admin.pages.reorder'),
            { id: dragIds[0], parent_id: parentId ?? '', index },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['tree', 'flash', 'errors'],
                onError: (errors) => toast.error(errors.tree ?? 'Не удалось переместить страницу'),
            },
        );
    }, []);

    /** Inline-переименование → PATCH только имени. */
    const handleRename = useCallback(({ id, name }) => {
        if (!name) return;

        router.post(
            route('admin.pages.update', id),
            { _method: 'put', name },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['tree', 'page', 'flash', 'errors'],
                onError: () => toast.error('Не удалось переименовать'),
            },
        );
    }, []);

    /** Запрет дропа внутрь самого себя / своего потомка. */
    const disableDrop = useCallback(({ parentNode, dragNodes }) => (
        dragNodes.some((dragNode) => {
            let cursor = parentNode;
            while (cursor) {
                if (cursor.id === dragNode.id) return true;
                cursor = cursor.parent;
            }
            return false;
        })
    ), []);

    const searchMatch = useCallback(
        (node, term) => node.data.name.toLowerCase().includes(term.toLowerCase()),
        [],
    );

    const contextValue = useMemo(
        () => ({ onActivate: handleActivate, onContextMenu: handleContextMenu }),
        [handleActivate, handleContextMenu],
    );

    const menuAction = (action) => () => {
        const node = menu.node;
        closeMenu();
        if (!node) return;

        switch (action) {
            case 'child':
                router.get(route('admin.pages.create'), { parent: node.id }, {
                    preserveState: true, preserveScroll: true, only: ['page', 'parents', 'mode'],
                });
                break;
            case 'sibling':
                router.get(route('admin.pages.create'), { parent: node.parent?.id ?? '' }, {
                    preserveState: true, preserveScroll: true, only: ['page', 'parents', 'mode'],
                });
                break;
            case 'rename':
                node.edit();
                break;
            case 'duplicate':
                router.post(route('admin.pages.duplicate', node.id), {}, { preserveScroll: true });
                break;
            case 'toggle':
                router.put(route('admin.pages.toggle', node.id), {}, {
                    preserveState: true, preserveScroll: true, only: ['tree', 'page', 'flash'],
                });
                break;
            case 'preview':
                window.open(node.data.url, '_blank', 'noopener');
                break;
            case 'delete':
                if (window.confirm(`Удалить «${node.data.name}»?\nДочерние страницы поднимутся на уровень выше.`)) {
                    router.delete(route('admin.pages.destroy', node.id), { preserveScroll: true });
                }
                break;
            default:
                break;
        }
    };

    return (
        <Stack spacing={1} sx={{ height: '100%', minHeight: 0 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Поиск по дереву…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                            ),
                            endAdornment: search && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearch('')}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                />
                <IconButton size="small" title="Развернуть всё" onClick={() => treeRef.current?.openAll()}>
                    <UnfoldMoreIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" title="Свернуть всё" onClick={() => treeRef.current?.closeAll()}>
                    <UnfoldLessIcon fontSize="small" />
                </IconButton>
            </Stack>

            <TreeContext.Provider value={contextValue}>
                <TreeSurface sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {data.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                            Страниц пока нет — создайте первую.
                        </Typography>
                    ) : (
                        <Tree
                            ref={treeRef}
                            data={data}
                            idAccessor="id"
                            childrenAccessor="children"
                            openByDefault={false}
                            selection={selection}
                            width="100%"
                            height={height}
                            rowHeight={TREE_METRICS.rowHeight}
                            indent={TREE_METRICS.indent}
                            paddingTop={TREE_METRICS.padding}
                            paddingBottom={TREE_METRICS.padding}
                            searchTerm={search}
                            searchMatch={searchMatch}
                            disableDrop={disableDrop}
                            onMove={handleMove}
                            onRename={handleRename}
                            onActivate={handleActivate}
                            renderCursor={({ top, left, indent }) => (
                                <div className="rt-cursor" style={{ top, left, right: indent }} />
                            )}
                        >
                            {TreeNode}
                        </Tree>
                    )}
                </TreeSurface>
            </TreeContext.Provider>

            <Menu
                open={Boolean(menu.node)}
                onClose={closeMenu}
                anchorReference="anchorPosition"
                anchorPosition={{ top: menu.mouseY, left: menu.mouseX }}
                slotProps={{ paper: { sx: { minWidth: 220 } } }}
                dense
            >
                <MenuItem onClick={menuAction('child')}>
                    <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Создать вложенную</ListItemText>
                </MenuItem>
                <MenuItem onClick={menuAction('sibling')}>
                    <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Создать рядом</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={menuAction('rename')}>
                    <ListItemIcon><DriveFileRenameOutlineIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Переименовать</ListItemText>
                    <Typography variant="caption" color="text.secondary">F2</Typography>
                </MenuItem>
                <MenuItem onClick={menuAction('duplicate')}>
                    <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Дублировать</ListItemText>
                </MenuItem>
                <MenuItem onClick={menuAction('toggle')}>
                    <ListItemIcon><VisibilityOutlinedIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>
                        {menu.node?.data.published ? 'Снять с публикации' : 'Опубликовать'}
                    </ListItemText>
                </MenuItem>
                <MenuItem onClick={menuAction('preview')}>
                    <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Открыть на сайте</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={menuAction('delete')} sx={{ color: 'error.main' }}>
                    <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText>Удалить</ListItemText>
                </MenuItem>
            </Menu>
        </Stack>
    );
}

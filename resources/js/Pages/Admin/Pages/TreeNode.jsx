import { memo, useContext } from 'react';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FolderIcon from '@mui/icons-material/Folder';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';

import { TreeContext } from '@/Contexts/Admin/TreeContext.jsx';

/** Пунктирные направляющие для уровней вложенности (аналог jsTree connectors). */
function Guides({ node }) {
    const lines = [];

    for (let level = 0; level < node.level; level += 1) {
        lines.push(<span key={level} className="rt-guide rt-guide-line" />);
    }

    if (node.level > 0) {
        // последний уровень — «колено»; сквозная линия, если у узла есть следующий сиблинг
        const hasNextSibling = Boolean(node.nextSibling);
        lines[node.level - 1] = (
            <span
                key="elbow"
                className={`rt-guide rt-elbow${hasNextSibling ? ' rt-elbow-through' : ''}`}
            />
        );
    }

    return lines;
}

/**
 * Строка дерева страниц.
 *
 * Компонент объявлен на уровне модуля и обёрнут в memo — arborist получает
 * стабильный тип, поэтому строки не размонтируются на каждый рендер.
 *
 * @param {object}   props.node       узел arborist (NodeApi)
 * @param {object}   props.style      позиционирование от virtualizer — обязательно применить
 * @param {Function} props.dragHandle ref для drag-хендла
 */
function TreeNode({ node, style, dragHandle }) {
    const { onContextMenu, onActivate } = useContext(TreeContext);
    const { name, published, in_menu: inMenu } = node.data;

    const classes = [
        'rt-row',
        node.isSelected && 'rt-selected',
        node.isFocused && 'rt-focused',
        node.willReceiveDrop && 'rt-match',
        node.isDragging && 'rt-dragging',
        !published && 'rt-unpublished',
    ]
        .filter(Boolean)
        .join(' ');

    const FolderGlyph = node.isOpen ? FolderOpenIcon : FolderIcon;
    const LeafGlyph = node.level === 0 ? HomeOutlinedIcon : ArticleOutlinedIcon;

    return (
        <Box style={style} ref={dragHandle} sx={{ position: 'relative' }}>
            <div
                className={classes}
                role="treeitem"
                aria-selected={node.isSelected}
                aria-expanded={node.isInternal ? node.isOpen : undefined}
                onClick={() => onActivate(node)}
                onContextMenu={(event) => onContextMenu(event, node)}
                onDoubleClick={() => node.isInternal && node.toggle()}
            >
                <Guides node={node} />

                <span
                    className="rt-toggle"
                    onClick={(event) => {
                        event.stopPropagation();
                        node.toggle(); // состояние держит arborist — свой useState не нужен
                    }}
                >
                    {node.isInternal
                        ? (node.isOpen ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ChevronRightIcon sx={{ fontSize: 16 }} />)
                        : null}
                </span>

                {node.isInternal
                    ? <FolderGlyph sx={{ fontSize: 15, mr: 0.5, color: 'warning.main', flexShrink: 0 }} />
                    : <LeafGlyph sx={{ fontSize: 15, mr: 0.5, color: 'text.secondary', flexShrink: 0 }} />}

                {node.isEditing ? (
                    <input
                        className="rt-input"
                        autoFocus
                        defaultValue={name}
                        onClick={(event) => event.stopPropagation()}
                        onBlur={() => node.reset()}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') node.reset();
                            if (event.key === 'Enter') node.submit(event.currentTarget.value.trim());
                        }}
                    />
                ) : (
                    <span className="rt-label">{name}</span>
                )}

                {!published && (
                    <Tooltip title="Не опубликована">
                        <VisibilityOffOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 0.5 }} />
                    </Tooltip>
                )}

                {inMenu?.length > 0 && (
                    <Tooltip title={`В меню: ${inMenu.join(', ')}`}>
                        <Box
                            component="span"
                            sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main', ml: 0.75, flexShrink: 0 }}
                        />
                    </Tooltip>
                )}
            </div>
        </Box>
    );
}

export default memo(TreeNode);

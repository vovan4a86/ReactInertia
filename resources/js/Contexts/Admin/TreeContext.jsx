import { createContext } from 'react';

/**
 * Колбэки дерева передаются через контекст: рендерер строки в react-arborist
 * получает только (node, style, dragHandle, tree), а inline-стрелочная функция
 * в `children` привела бы к remount всех строк.
 */
export const TreeContext = createContext({
    onActivate: () => {},
    onContextMenu: () => {},
});

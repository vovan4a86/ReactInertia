import { lazy, memo, Suspense } from 'react';
import { Box, Skeleton } from '@mui/material';
import TextareaInput from './TextareaInput';

/**
 * TipTap + все расширения весят сотни килобайт. Статический импорт тянул их
 * в общий бандл админки, даже если на странице нет ни одной настройки типа
 * «Редактор». Грузим чанк по требованию.
 */
const RichTextEditor = lazy(() => import('./RichTextEditor/RichTextEditor.jsx'));

/** Заглушка на время загрузки чанка — по габаритам совпадает с редактором. */
function EditorFallback() {
    return (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <Skeleton variant="rectangular" height={44} />
            <Skeleton variant="rectangular" height={200} sx={{ mt: '1px' }} />
        </Box>
    );
}

/**
 * Поле WYSIWYG с возможностью откатиться на обычную textarea.
 *
 * @param {object}   props
 * @param {string}   [props.value]                     HTML-разметка
 * @param {(html: string) => void} props.onChange
 * @param {string}   [props.placeholder]
 * @param {boolean}  [props.useRichEditor=true]        false → обычная textarea
 * @param {boolean}  [props.disabled=false]
 * @param {number}   [props.debounceMs=300]            задержка перед onChange
 */

function EditorInput({
                         value,
                         onChange,
                         placeholder = 'Введите текст...',
                         useRichEditor = true,
                         disabled = false,
                         ...props
                     }) {
    if (!useRichEditor) {
        return (
            <TextareaInput
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                rows={10}
                maxRows={30}
                {...props}
            />
        );
    }

    return (
        <Suspense fallback={<EditorFallback />}>
            <RichTextEditor
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                {...props}
            />
        </Suspense>
    );
}

export default memo(EditorInput);


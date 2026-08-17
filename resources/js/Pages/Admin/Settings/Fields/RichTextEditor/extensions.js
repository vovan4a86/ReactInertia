import { StarterKit } from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Image } from '@tiptap/extension-image';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { sanitizeUrl } from './urls';

/**
 * Сборка расширений редактора под TipTap v3.
 *
 * Почему именно так:
 *
 * 1. В v3 StarterKit уже содержит Link, Underline, ListKeymap и TrailingNode.
 *    Повторная регистрация тех же имён приводит к ошибке «Duplicate extension
 *    names found». Именно поэтому Link настраивается ВНУТРИ StarterKit,
 *    а не подключается отдельным пакетом — иначе теряется вся его конфигурация
 *    (target/rel), как это было в прежней версии с закомментированным Link.
 *
 * 2. Пакеты `@tiptap/extension-underline`, `@tiptap/extension-color`,
 *    `@tiptap/extension-task-list`, `@tiptap/extension-table-row` и т.п.
 *    в v3 расформированы. Актуальные адреса:
 *      Placeholder       → @tiptap/extensions
 *      TextStyle, Color  → @tiptap/extension-text-style
 *      TaskList/TaskItem → @tiptap/extension-list
 *      Table*            → @tiptap/extension-table (TableKit)
 *
 * 3. Color требует TextStyle, поэтому TextStyle подключён явно —
 *    в StarterKit его нет, дубликата не будет.
 *
 * @param {object}  options
 * @param {string}  options.placeholder
 * @param {boolean} [options.allowBase64=false]  разрешить вставку data:URI картинок
 * @returns {Array} массив расширений для useEditor
 */
export function buildExtensions({ placeholder, allowBase64 = false }) {
    return [
        StarterKit.configure({
            heading: { levels: [1, 2, 3, 4] },
            link: {
                openOnClick: false, // в админке клик должен ставить курсор, а не уводить со страницы
                autolink: true,
                defaultProtocol: 'https',
                HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
                // Отсекаем javascript:/vbscript: ещё до попадания в документ.
                isAllowedUri: (url) => sanitizeUrl(url) !== null,
            },
        }),

        Placeholder.configure({ placeholder }),

        TextStyle,
        Color,

        Image.configure({
            inline: false,
            // base64 раздувает значение настройки на мегабайты и легко упирается
            // в max_allowed_packet / размер колонки. По умолчанию выключено.
            allowBase64,
        }),

        TextAlign.configure({ types: ['heading', 'paragraph'] }),

        TableKit.configure({
            table: { resizable: true, allowTableNodeSelection: true },
        }),

        Highlight.configure({ multicolor: true }),

        TaskList,
        TaskItem.configure({ nested: true }),
    ];
}

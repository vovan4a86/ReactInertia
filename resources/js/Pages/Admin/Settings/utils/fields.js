/**
 * Работа с описанием под-полей составных настроек (params.fields).
 *
 * params.fields — это объект вида:
 *   { title: { type: 0, title: 'Заголовок', order: 0 }, ... }
 *
 * ВАЖНО про порядок: спецификация JS гарантирует порядок ключей объекта
 * только для нечисловых ключей — «1», «2» всегда всплывают в начало.
 * Поэтому порядок хранится явным полем `order`, а не выводится из Object.keys().
 */

import { SETTING_TYPE, uid } from './uploads';

/** Ключ поля: латиница, цифры, «_», начинается с буквы (зеркало SettingRequest::FIELD_KEY_PATTERN). */
export const FIELD_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/** Типы, допустимые для под-полей (вложенные составные типы запрещены). */
export const FIELD_TYPES = Object.freeze([
    SETTING_TYPE.TEXT,
    SETTING_TYPE.TEXTAREA,
    SETTING_TYPE.EDITOR,
    SETTING_TYPE.FILE,
    SETTING_TYPE.BOOLEAN,
]);

const FALLBACK_LABELS = {
    [SETTING_TYPE.TEXT]: 'Текстовое поле',
    [SETTING_TYPE.TEXTAREA]: 'Текстовая область',
    [SETTING_TYPE.EDITOR]: 'Редактор',
    [SETTING_TYPE.FILE]: 'Файл',
    [SETTING_TYPE.BOOLEAN]: 'Флажок',
};

/**
 * Список допустимых типов под-полей для селекта.
 *
 * @param {Record<number|string, string>} [labels] карта подписей с бэкенда
 * @returns {Array<{value: number, label: string}>}
 */
export const fieldTypeOptions = (labels = {}) =>
    FIELD_TYPES.map((value) => ({
        value,
        label: labels?.[value] ?? labels?.[String(value)] ?? FALLBACK_LABELS[value],
    }));

/**
 * Упорядоченный список полей настройки.
 *
 * @param {Record<string, {type: number, title?: string, order?: number}>} fields
 * @returns {Array<[string, object]>} пары [ключ, конфиг] в правильном порядке
 */
export const sortFields = (fields) => {
    if (!fields || typeof fields !== 'object') return [];

    return Object.entries(fields)
        .map(([key, config], index) => ({
            key,
            config: config ?? {},
            order: Number.isFinite(Number(config?.order)) ? Number(config.order) : index,
            index,
        }))
        // Стабильная сортировка: при равных order сохраняем исходный порядок.
        .sort((a, b) => a.order - b.order || a.index - b.index)
        .map(({ key, config }) => [key, config]);
};

/**
 * Объект полей → массив строк редактора (со стабильными id для drag&drop).
 *
 * @returns {Array<{id: string, key: string, originalKey: string|null, title: string, type: number}>}
 */
export const fieldsToRows = (fields) =>
    sortFields(fields).map(([key, config]) => ({
        id: uid(),
        key,
        originalKey: key, // нужен для карты переименований
        title: String(config?.title ?? ''),
        type: FIELD_TYPES.includes(Number(config?.type)) ? Number(config.type) : SETTING_TYPE.TEXT,
    }));

/**
 * Массив строк редактора → объект params.fields.
 * Порядок фиксируется полем `order`, пустые ключи отбрасываются.
 */
export const rowsToFields = (rows) => {
    const result = {};

    rows.forEach((row, index) => {
        const key = row.key.trim();

        if (key === '') return;

        result[key] = {
            type: Number(row.type),
            title: row.title.trim() || key,
            order: index,
        };
    });

    return result;
};

/**
 * Карта переименований [старый ключ => новый ключ] для бэкенда:
 * без неё сохранённое значение осталось бы под старым ключом.
 *
 * @returns {Record<string, string>}
 */
export const collectRenames = (rows) =>
    rows.reduce((acc, row) => {
        const key = row.key.trim();

        if (row.originalKey && key && row.originalKey !== key) {
            acc[row.originalKey] = key;
        }

        return acc;
    }, {});

/** Транслитерация RU → EN для автогенерации ключа из названия. */
const TRANSLIT = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
    э: 'e', ю: 'yu', я: 'ya',
};

/**
 * Сгенерировать корректный ключ из названия поля.
 *
 * @example slugifyKey('Заголовок блока') // 'zagolovok_bloka'
 */
export const slugifyKey = (title) => {
    const slug = String(title ?? '')
        .toLowerCase()
        .split('')
        .map((char) => TRANSLIT[char] ?? char)
        .join('')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40);

    if (slug === '') return '';

    // Ключ обязан начинаться с буквы.
    return /^[a-z]/.test(slug) ? slug : `f_${slug}`;
};

/**
 * Валидация строк редактора полей.
 *
 * @returns {{errors: Record<string, string>, valid: boolean}} errors по id строки
 */
export const validateRows = (rows) => {
    const errors = {};
    const seen = new Map();

    rows.forEach((row) => {
        const key = row.key.trim();

        if (key === '') {
            errors[row.id] = 'Ключ обязателен';
            return;
        }

        if (!FIELD_KEY_PATTERN.test(key)) {
            errors[row.id] = 'Латиница, цифры и «_», начиная с буквы';
            return;
        }

        if (seen.has(key)) {
            errors[row.id] = 'Такой ключ уже используется';
            errors[seen.get(key)] = 'Такой ключ уже используется';
            return;
        }

        seen.set(key, row.id);
    });

    return { errors, valid: Object.keys(errors).length === 0 };
};

/**
 * Поля, у которых изменение приведёт к удалению файлов на сервере:
 * удалённые файловые поля и файловые поля, сменившие тип.
 *
 * @returns {string[]} подписи затронутых полей
 */
export const destructiveChanges = (originalFields, rows) => {
    const affected = [];
    const byOriginal = new Map(rows.filter((row) => row.originalKey).map((row) => [row.originalKey, row]));

    sortFields(originalFields).forEach(([key, config]) => {
        if (Number(config?.type) !== SETTING_TYPE.FILE) return;

        const row = byOriginal.get(key);

        if (!row) {
            affected.push(config?.title || key);
        } else if (Number(row.type) !== SETTING_TYPE.FILE) {
            affected.push(row.title || key);
        }
    });

    return affected;
};

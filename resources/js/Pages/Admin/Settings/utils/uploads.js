/**
 * Протокол передачи файлов настроек.
 *
 * Значение поля хранит НЕ индекс, а уникальный маркер `@upload:<token>`.
 * Сам файл уходит в FormData как `uploads[<token>]`.
 *
 * Благодаря этому сортировка (drag&drop) и удаление строк не ломают привязку
 * файлов — раньше ключ содержал индекс (`settings[7][0][field]`) и «уезжал».
 */

export const UPLOAD_PREFIX = '@upload:';

/** Типы настроек (зеркало App\Enums\SettingType). */
export const SETTING_TYPE = Object.freeze({
    TEXT: 0,
    TEXTAREA: 1,
    EDITOR: 2,
    FILE: 3,
    DATA: 4,
    LIST: 5,
    LIST_DATA: 6,
    GALLERY: 7,
});

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'avif', 'svg'];

/** Криптостойкий (с фоллбэком) генератор идентификаторов. */
export const uid = () =>
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Является ли значение маркером загрузки. */
export const isUploadMarker = (value) =>
    typeof value === 'string' && value.startsWith(UPLOAD_PREFIX);

/** Создать маркер из токена. */
export const toUploadMarker = (token) => `${UPLOAD_PREFIX}${token}`;

/** Достать токен из маркера. */
export const uploadToken = (value) =>
    isUploadMarker(value) ? value.slice(UPLOAD_PREFIX.length) : null;

/** Легаси-маркеры прежней реализации — считаем «пустым» значением. */
export const isLegacyMarker = (value) =>
    typeof value === 'string' && (value.startsWith('settings[') || value.startsWith('settings.'));

/** Значение указывает на реально сохранённый файл. */
export const isStoredFile = (value) =>
    typeof value === 'string' && value !== '' && !isUploadMarker(value) && !isLegacyMarker(value);

/** Похоже ли имя/URL на изображение. */
export const isImagePath = (path) => {
    if (typeof path !== 'string') return false;
    const ext = path.split('?')[0].split('.').pop()?.toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext ?? '');
};

/** Читаемый размер файла. */
export const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 Б';
    const units = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
};

/** Убрать служебные ключи (`_key`) перед отправкой на сервер. */
export const stripInternalKeys = (row) =>
    Object.fromEntries(Object.entries(row ?? {}).filter(([key]) => !key.startsWith('_')));

/**
 * Собрать все токены загрузок, реально используемые в payload.
 * Файлы «осиротевших» токенов (пользователь выбрал файл, потом удалил строку)
 * в FormData не попадают — сервер не получает мусор.
 *
 * @param {unknown} node
 * @param {Set<string>} acc
 * @returns {Set<string>}
 */
export const collectUploadTokens = (node, acc = new Set()) => {
    if (typeof node === 'string') {
        const token = uploadToken(node);
        if (token) acc.add(token);
        return acc;
    }

    if (Array.isArray(node)) {
        node.forEach((item) => collectUploadTokens(item, acc));
        return acc;
    }

    if (node && typeof node === 'object') {
        Object.values(node).forEach((item) => collectUploadTokens(item, acc));
    }

    return acc;
};

/**
 * Нормализация значения настройки, пришедшего с сервера,
 * в форму, удобную для редактирования на клиенте.
 *
 * @param {{type: number, value: unknown}} setting
 */
export const normalizeValue = ({ type, value }) => {
    switch (type) {
        case SETTING_TYPE.TEXT:
        case SETTING_TYPE.TEXTAREA:
        case SETTING_TYPE.EDITOR:
            return typeof value === 'string' ? value : '';

        case SETTING_TYPE.FILE:
            return isStoredFile(value) ? value : null;

        case SETTING_TYPE.DATA:
            return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};

        case SETTING_TYPE.LIST:
            return Array.isArray(value) ? value.filter((i) => typeof i === 'string') : [];

        case SETTING_TYPE.LIST_DATA:
            // `_key` — стабильный ключ строки для React и dnd-kit, на сервер не уходит.
            return Array.isArray(value)
                ? value.filter((row) => row && typeof row === 'object').map((row) => ({ ...row, _key: uid() }))
                : [];

        case SETTING_TYPE.GALLERY:
            return Array.isArray(value) ? [...new Set(value.filter(isStoredFile))] : [];

        default:
            return value ?? '';
    }
};

/**
 * Подготовка значения к отправке: убираем служебные ключи и File-объекты.
 */
export const serializeValue = (type, value) => {
    if (type === SETTING_TYPE.LIST_DATA && Array.isArray(value)) {
        return value.map(stripInternalKeys);
    }

    if (type === SETTING_TYPE.GALLERY && Array.isArray(value)) {
        return value.filter((item) => typeof item === 'string');
    }

    return value ?? null;
};

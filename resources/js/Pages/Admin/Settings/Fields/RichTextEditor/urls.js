/**
 * Схемы, которые разрешено использовать в href/src редактора.
 * Список синхронизирован с App\Support\HtmlSanitizer::isDangerousUrl().
 */
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Привести пользовательский ввод к безопасному URL.
 *
 * Без этого в редактор можно вставить `javascript:alert(1)` — сервер такую
 * ссылку вырежет, но до сохранения она остаётся кликабельной в админке.
 *
 * @param {string} raw           введённое значение
 * @param {object} [options]
 * @param {boolean} [options.allowData=false]  разрешить data:image/*
 * @returns {string|null} нормализованный URL либо null, если ввод небезопасен
 */
export function sanitizeUrl(raw, { allowData = false } = {}) {
    const trimmed = String(raw ?? '').trim();

    if (trimmed === '') {
        return null;
    }

    // Относительные пути и якоря считаем безопасными как есть.
    if (/^[/#?]/.test(trimmed)) {
        return trimmed;
    }

    if (allowData && /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);base64,/i.test(trimmed)) {
        return trimmed;
    }

    // Нет схемы вообще («example.com/page») — достраиваем https.
    const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
        const url = new URL(candidate);

        return SAFE_SCHEMES.includes(url.protocol) ? url.toString() : null;
    } catch {
        return null;
    }
}

/**
 * Проверка без нормализации — для подсветки поля в диалоге.
 *
 * @param {string} raw
 * @param {object} [options]
 * @returns {boolean}
 */
export function isSafeUrl(raw, options) {
    return sanitizeUrl(raw, options) !== null;
}

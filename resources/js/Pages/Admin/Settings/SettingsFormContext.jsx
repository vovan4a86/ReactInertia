import React, {
    createContext,
    use,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    collectUploadTokens,
    isUploadMarker,
    normalizeValue,
    serializeValue,
    toUploadMarker,
    uid,
} from './utils/uploads';

/**
 * Контекст формы настроек: значения, реестр загрузок и сборка FormData.
 * Избавляет от прокидывания onFileChange/getFileUrl через 4 уровня компонентов.
 */
const SettingsFormContext = createContext(null);

/**
 * Хук доступа к форме настроек.
 * @returns {ReturnType<typeof useSettingsFormState>}
 */
export function useSettingsForm() {
    const ctx = use(SettingsFormContext);

    if (!ctx) {
        throw new Error('useSettingsForm() доступен только внутри <SettingsFormProvider>');
    }

    return ctx;
}

/**
 * Сигнатура серверных данных. Меняется только когда сервер прислал новые
 * значения (например, после сохранения) — тогда локальный стейт пересобирается,
 * а обычные ре-рендеры правки пользователя не сбрасывают.
 */
const buildSignature = (settings) =>
    JSON.stringify(settings.map((s) => [s.id, s.type, s.value]));

const buildValues = (settings) =>
    Object.fromEntries(settings.map((setting) => [setting.id, normalizeValue(setting)]));

function useSettingsFormState({ settings, groupId, onSave }) {
    const signature = buildSignature(settings);

    // Пересинхронизация с сервером «во время рендера» — официальный паттерн React
    // вместо useEffect + setState (нет лишнего кадра и мерцания).
    const [state, setState] = useState(() => ({ signature, values: buildValues(settings) }));

    if (state.signature !== signature) {
        setState({ signature, values: buildValues(settings) });
    }

    const { values } = state;

    /** Реестр выбранных файлов: token -> { file, previewUrl } */
    const [uploads, setUploads] = useState(() => new Map());
    const [processing, setProcessing] = useState(false);

    // Актуальная ссылка на реестр для корректной очистки objectURL при размонтировании.
    const uploadsRef = useRef(uploads);
    uploadsRef.current = uploads;

    useEffect(
        () => () => {
            uploadsRef.current.forEach(({ previewUrl }) => previewUrl && URL.revokeObjectURL(previewUrl));
        },
        [],
    );

    const settingsById = useMemo(
        () => new Map(settings.map((setting) => [String(setting.id), setting])),
        [settings],
    );

    /** Изменить значение настройки. */
    const setValue = useCallback((settingId, value) => {
        setState((prev) => ({
            ...prev,
            values: {
                ...prev.values,
                [settingId]: typeof value === 'function' ? value(prev.values[settingId]) : value,
            },
        }));
    }, []);

    /**
     * Зарегистрировать выбранный файл.
     * @param {File} file
     * @returns {string} маркер `@upload:<token>` — его и кладём в значение поля
     */
    const registerUpload = useCallback((file) => {
        const token = uid();
        const previewUrl = file.type?.startsWith('image/') ? URL.createObjectURL(file) : null;

        setUploads((prev) => new Map(prev).set(token, { file, previewUrl }));

        return toUploadMarker(token);
    }, []);

    /** Освободить загрузку (пользователь удалил файл/строку). */
    const releaseUpload = useCallback((marker) => {
        const token = isUploadMarker(marker) ? marker.slice('@upload:'.length) : null;
        if (!token) return;

        setUploads((prev) => {
            const entry = prev.get(token);
            if (!entry) return prev;
            if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);

            const next = new Map(prev);
            next.delete(token);
            return next;
        });
    }, []);

    /** Данные ещё не отправленной загрузки. */
    const getUpload = useCallback(
        (marker) => {
            const token = isUploadMarker(marker) ? marker.slice('@upload:'.length) : null;
            return token ? uploads.get(token) ?? null : null;
        },
        [uploads],
    );

    /**
     * Единая точка получения URL превью для любого файлового значения.
     * @param {object} setting настройка (нужна её карта file_urls)
     * @param {string|null} value значение поля
     */
    const resolveFileUrl = useCallback(
        (setting, value) => {
            if (!value) return null;

            const upload = getUpload(value);
            if (upload) return upload.previewUrl;

            // Плоская карта [имя файла => URL] — не зависит от порядка элементов.
            return setting?.file_urls?.[value] ?? null;
        },
        [getUpload],
    );

    /** Имя файла для отображения. */
    const resolveFileName = useCallback(
        (value) => getUpload(value)?.file?.name ?? (typeof value === 'string' ? value : null),
        [getUpload],
    );

    /** Миниатюры сохранённого изображения галереи. */
    const resolveThumbs = useCallback(
        (setting, value) => setting?.thumbs_data?.[value]?.thumbs ?? null,
        [],
    );

    /** Сборка тела запроса. */
    const buildFormData = useCallback(() => {
        const payload = {};

        settings.forEach((setting) => {
            payload[setting.id] = serializeValue(setting.type, values[setting.id]);
        });

        const formData = new FormData();
        formData.append('setting_group_id', String(groupId ?? ''));
        formData.append('payload', JSON.stringify(payload));

        // В запрос попадают только те файлы, на которые реально ссылается payload.
        collectUploadTokens(payload).forEach((token) => {
            const entry = uploads.get(token);
            if (entry?.file) {
                formData.append(`uploads[${token}]`, entry.file, entry.file.name);
            }
        });

        return formData;
    }, [settings, values, uploads, groupId]);

    /** Отправка формы. */
    const submit = useCallback(async () => {
        if (processing) return;

        setProcessing(true);

        try {
            await onSave(buildFormData());

            // Освобождаем objectURL: сервер вернёт постоянные ссылки.
            uploadsRef.current.forEach(({ previewUrl }) => previewUrl && URL.revokeObjectURL(previewUrl));
            setUploads(new Map());
        } finally {
            setProcessing(false);
        }
    }, [buildFormData, onSave, processing]);

    return useMemo(
        () => ({
            settings,
            settingsById,
            values,
            setValue,
            registerUpload,
            releaseUpload,
            getUpload,
            resolveFileUrl,
            resolveFileName,
            resolveThumbs,
            buildFormData,
            submit,
            processing,
            hasPendingUploads: uploads.size > 0,
        }),
        [
            settings, settingsById, values, setValue, registerUpload, releaseUpload, getUpload,
            resolveFileUrl, resolveFileName, resolveThumbs, buildFormData, submit, processing, uploads.size,
        ],
    );
}

/**
 * Провайдер формы настроек.
 *
 * @param {object}   props
 * @param {Array}    props.settings список настроек группы (из Inertia-пропсов)
 * @param {number}   props.groupId  id активной группы
 * @param {(fd: FormData) => Promise<void>} props.onSave обработчик сохранения
 */
export function SettingsFormProvider({ settings = [], groupId, onSave, children }) {
    const value = useSettingsFormState({ settings, groupId, onSave });

    // React 19: контекст можно рендерить напрямую, без .Provider
    return <SettingsFormContext value={value}>{children}</SettingsFormContext>;
}

export default SettingsFormContext;

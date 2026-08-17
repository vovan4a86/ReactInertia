import React, { memo } from 'react';
import TextFieldInput from './TextFieldInput';
import TextareaInput from './TextareaInput';
import EditorInput from './EditorInput';
import FileInput from './FileInput';
import DataFields from './DataFields';
import ListInput from './ListInput';
import ListDataInput from './ListDataInput';
import GalleryInput from './GalleryInput';
import { SETTING_TYPE } from '../utils/uploads';

/**
 * Диспетчер полей: по типу настройки рендерит нужный компонент.
 *
 * Никаких `name`, `onFileChange` и `getFileUrl` — файлы и превью
 * компоненты берут из SettingsFormContext, поэтому пропсы плоские
 * и одинаковые для всех типов.
 *
 * @param {object} props
 * @param {object} props.setting настройка (со схемой SettingResource)
 * @param {unknown} props.value  текущее значение из формы
 * @param {(value: unknown) => void} props.onChange
 */
function FieldRenderer({ setting, value, onChange }) {
    switch (Number(setting.type)) {
        case SETTING_TYPE.TEXTAREA:
            return <TextareaInput value={value ?? ''} onChange={onChange} rows={4} fullWidth />;

        case SETTING_TYPE.EDITOR:
            return <EditorInput value={value ?? ''} onChange={onChange} />;

        case SETTING_TYPE.FILE:
            return <FileInput setting={setting} value={value ?? null} onChange={onChange} />;

        case SETTING_TYPE.DATA:
            return (
                <DataFields
                    setting={setting}
                    value={value && typeof value === 'object' && !Array.isArray(value) ? value : {}}
                    onChange={onChange}
                />
            );

        case SETTING_TYPE.LIST:
            return <ListInput value={Array.isArray(value) ? value : []} onChange={onChange} />;

        case SETTING_TYPE.LIST_DATA:
            return (
                <ListDataInput
                    setting={setting}
                    value={Array.isArray(value) ? value : []}
                    onChange={onChange}
                />
            );

        case SETTING_TYPE.GALLERY:
            return (
                <GalleryInput
                    setting={setting}
                    value={Array.isArray(value) ? value : []}
                    onChange={onChange}
                />
            );

        case SETTING_TYPE.TEXT:
        default:
            return <TextFieldInput value={value ?? ''} onChange={onChange} fullWidth />;
    }
}

export default memo(FieldRenderer);

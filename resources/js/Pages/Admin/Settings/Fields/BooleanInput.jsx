import { memo, useId } from 'react';
import {
    Checkbox,
    FormControl,
    FormControlLabel,
    FormHelperText,
    Switch,
    Typography,
} from '@mui/material';
import { toBool } from '../utils/uploads';

/**
 * Настройка-флажок (тип 8).
 *
 * Значение всегда приводится к настоящему boolean: из БД оно может прийти
 * строкой '1' / '0', а `Boolean('0')` вернул бы true.
 *
 * Внешний вид настраивается из админки через params, без правки кода:
 *   { "control": "checkbox" }        — чекбокс вместо переключателя
 *   { "label": "Показывать блок" }   — подпись рядом с элементом
 *   { "on_label": "Да", "off_label": "Нет" } — динамическая подпись состояния
 *   { "color": "success" }           — цвет MUI
 *
 * @param {object} props
 * @param {unknown} props.value           текущее значение (bool | '1' | '0' | null)
 * @param {(value: boolean) => void} props.onChange
 * @param {string} [props.label]          подпись рядом с элементом
 * @param {string} [props.onLabel]        подпись во включённом состоянии
 * @param {string} [props.offLabel]       подпись в выключенном состоянии
 * @param {'switch'|'checkbox'} [props.control='switch']
 * @param {string} [props.color='primary']
 * @param {string} [props.helperText]     пояснение под элементом
 * @param {boolean} [props.disabled]
 * @param {'small'|'medium'} [props.size='medium']
 */
function BooleanInput({
                          value,
                          onChange,
                          label,
                          onLabel,
                          offLabel,
                          control = 'switch',
                          color = 'primary',
                          helperText,
                          disabled = false,
                          size = 'medium',
                      }) {
    const id = useId();
    const checked = toBool(value);

    // Подпись состояния имеет приоритет над статической.
    const stateLabel = checked ? onLabel : offLabel;
    const text = stateLabel ?? label ?? (checked ? 'Включено' : 'Выключено');

    const Control = control === 'checkbox' ? Checkbox : Switch;

    return (
        <FormControl component="fieldset" variant="standard" disabled={disabled}>
            <FormControlLabel
                // MUI сам не переносит id на input — задаём явно для <label for>.
                htmlFor={id}
                control={
                    <Control
                        id={id}
                        checked={checked}
                        // Читаем именно event.target.checked: у Switch/Checkbox
                        // event.target.value — это строка 'on', а не состояние.
                        onChange={(event) => onChange(event.target.checked)}
                        color={color}
                        size={size}
                        disabled={disabled}
                        slotProps={{ input: { 'aria-label': label ?? text } }}
                    />
                }
                label={
                    <Typography
                        variant="body2"
                        color={checked ? 'text.primary' : 'text.secondary'}
                        sx={{ userSelect: 'none' }}
                    >
                        {text}
                    </Typography>
                }
                sx={{ ml: 0, mr: 0 }}
            />

            {helperText && <FormHelperText sx={{ ml: 0 }}>{helperText}</FormHelperText>}
        </FormControl>
    );
}

export default memo(BooleanInput);

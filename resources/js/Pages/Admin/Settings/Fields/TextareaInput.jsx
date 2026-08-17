import { memo, useCallback } from 'react';
import { TextField } from '@mui/material';

/**
 * Многострочное поле.
 *
 * ВАЖНО про MUI: пропсы `rows` и `maxRows` взаимоисключающие.
 * Если задан `rows`, textarea получает фиксированную высоту, а `maxRows`
 * молча игнорируется. Поэтому здесь используется пара `minRows`/`maxRows`
 * (автоподстройка высоты), а фиксированная высота включается только
 * явным `autoResize={false}`.
 *
 * @param {object}   props
 * @param {string}   [props.value]
 * @param {(v: string) => void} props.onChange
 * @param {string}   [props.placeholder]
 * @param {number}   [props.rows=4]              стартовое кол-во строк
 * @param {number}   [props.maxRows=12]          предел роста при autoResize
 * @param {boolean}  [props.autoResize=true]     растягивать под содержимое
 * @param {boolean}  [props.disabled=false]
 * @param {boolean}  [props.required=false]
 * @param {boolean}  [props.fullWidth=true]
 * @param {'small'|'medium'} [props.size='small']
 * @param {string}   [props.error]
 * @param {string}   [props.helperText]
 * @param {number}   [props.maxLength]
 */
function TextareaInput({
                           value,
                           onChange,
                           placeholder,
                           rows = 4,
                           maxRows = 12,
                           autoResize = true,
                           disabled = false,
                           required = false,
                           fullWidth = true,
                           size = 'small',
                           error,
                           helperText,
                           maxLength,
                           ...props
                       }) {
    const handleChange = useCallback(
        (event) => onChange?.(event.target.value),
        [onChange],
    );

    // Взаимоисключающие наборы — смешивать нельзя.
    const sizing = autoResize
        ? { minRows: rows, maxRows: Math.max(rows, maxRows) }
        : { rows };

    return (
        <TextField
            {...props}
            {...sizing}
            multiline
            value={value ?? ''}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            fullWidth={fullWidth}
            size={size}
            variant="outlined"
            error={Boolean(error)}
            helperText={error || helperText}
            slotProps={{
                htmlInput: { maxLength },
            }}
        />
    );
}

export default memo(TextareaInput);

import { memo, useCallback } from 'react';
import { TextField } from '@mui/material';

function TextFieldInput({
                            value,
                            onChange,
                            placeholder,
                            type = 'text',
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

    return (
        <TextField
            {...props}
            type={type}
            // value ?? '' — иначе при value === null/undefined поле становится
            // неуправляемым и React ругается при первом же вводе символа.
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

export default memo(TextFieldInput);

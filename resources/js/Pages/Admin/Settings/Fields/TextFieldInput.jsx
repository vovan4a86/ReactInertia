import React from 'react';
import { TextField } from '@mui/material';

export default function TextFieldInput({
                                           name,
                                           value,
                                           onChange,
                                           placeholder,
                                           type = 'text',
                                           disabled = false,
                                           required = false,
                                           fullWidth = true,
                                           size = 'small',
                                           ...props
                                       }) {
    const handleChange = (e) => {
        onChange(e.target.value);
    };

    return (
        <TextField
            fullWidth={fullWidth}
            size={size}
            name={name}
            type={type}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            variant="outlined"
            {...props}
        />
    );
}

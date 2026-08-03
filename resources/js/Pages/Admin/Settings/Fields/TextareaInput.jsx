import React from 'react';
import { TextField } from '@mui/material';

export default function TextareaInput({
                                          name,
                                          value,
                                          onChange,
                                          placeholder,
                                          rows = 4,
                                          maxRows = 10,
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
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            variant="outlined"
            multiline
            rows={rows}
            maxRows={maxRows}
            {...props}
        />
    );
}

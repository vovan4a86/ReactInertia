import React from 'react';
import {
    Box,
    IconButton,
    TextField,
    Button,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Add as AddIcon,
    DragIndicator as DragIcon,
} from '@mui/icons-material';

export default function ListInput({ name, value = [], onChange }) {
    const handleAdd = () => {
        onChange([...value, '']);
    };

    const handleRemove = (index) => {
        const newList = value.filter((_, i) => i !== index);
        onChange(newList);
    };

    const handleChange = (index, newValue) => {
        const newList = [...value];
        newList[index] = newValue;
        onChange(newList);
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Enter' && index === value.length - 1) {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <Box>
            {value.map((item, index) => (
                <Box
                    key={index}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                    }}
                >
                    <DragIcon
                        sx={{
                            color: 'text.disabled',
                            cursor: 'grab',
                            '&:active': { cursor: 'grabbing' },
                        }}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        value={item}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        placeholder={`Элемент ${index + 1}`}
                        variant="outlined"
                    />
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemove(index)}
                        title="Удалить элемент"
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            ))}

            <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                variant="text"
                sx={{ mt: 1 }}
            >
                Добавить элемент
            </Button>
        </Box>
    );
}

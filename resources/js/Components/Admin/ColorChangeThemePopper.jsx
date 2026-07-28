import { Popper, Paper, Box, Typography } from '@mui/material';
import { useColorMode } from '@/app'; // Импортируем ваш хук

export default function ColorChangeThemePopper({ id, open, anchorEl }) {
    const { toggleColorMode } = useColorMode();

    return (
        <Popper id={id} open={open} anchorEl={anchorEl} placement="top-end">
            <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1">Theme Settings</Typography>
                <Box sx={{ mt: 1 }}>
                    {/* Тут ваши контролы для смены темы */}
                    <button onClick={toggleColorMode}>Toggle Theme</button>
                </Box>
            </Paper>
        </Popper>
    );
}

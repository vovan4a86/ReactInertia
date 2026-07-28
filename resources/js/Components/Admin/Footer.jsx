import { Box, Typography } from '@mui/material';

export default function AdminFooter({ children }) {
    return (
        <Box
            component="footer"
            sx={{
                py: 3,
                px: 2,
                mt: 'auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid',
                borderColor: 'divider',
            }}
        >
            {children || <Typography variant="body2">Your footer content here</Typography>}
        </Box>
    );
}

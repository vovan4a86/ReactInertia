import PropTypes from 'prop-types';
import { Box, Paper, Stack, Typography } from '@mui/material';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';

const format = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
};

const Cell = ({ value, tone }) => (
    <Box
        sx={{
            flex: 1,
            p: 1,
            borderRadius: 1.5,
            fontSize: 13,
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 180,
            overflow: 'auto',
            bgcolor: tone === 'old' ? 'error.softBg' : 'success.softBg',
            border: '1px solid',
            borderColor: tone === 'old' ? 'error.light' : 'success.light',
            color: tone === 'old' ? 'error.dark' : 'success.dark',
            ...(tone === 'old' && { textDecoration: 'line-through', opacity: 0.85 }),
        }}
    >
        {format(value)}
    </Box>
);

Cell.propTypes = { value: PropTypes.any, tone: PropTypes.oneOf(['old', 'new']) };

export default function ActivityDiff({ properties }) {
    const attributes = properties?.attributes ?? {};
    const old = properties?.old ?? {};
    const keys = [...new Set([...Object.keys(old), ...Object.keys(attributes)])];

    if (keys.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                Детальные данные по этому событию не сохранялись.
            </Typography>
        );
    }

    return (
        <Stack spacing={1.5}>
            {keys.map((key) => (
                <Paper key={key} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                        {key}
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                        {Object.keys(old).length > 0 && <Cell value={old[key]} tone="old" />}
                        {Object.keys(old).length > 0 && <ArrowRightAltIcon fontSize="small" color="disabled" />}
                        <Cell value={attributes[key]} tone="new" />
                    </Stack>
                </Paper>
            ))}
        </Stack>
    );
}

ActivityDiff.propTypes = { properties: PropTypes.object };

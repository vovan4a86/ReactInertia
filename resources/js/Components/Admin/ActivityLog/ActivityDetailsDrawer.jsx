import PropTypes from 'prop-types';
import { Link } from '@inertiajs/react';
import {
    Avatar, Box, Button, Chip, CircularProgress, Divider, Drawer,
    IconButton, Stack, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import dayjs from 'dayjs';
import ActivityEventChip from './ActivityEventChip.jsx';
import ActivityDiff from './ActivityDiff.jsx';
import { initials, stringToColor } from './activityMeta.jsx';

const Row = ({ label, children }) => (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, flexShrink: 0 }}>
            {label}
        </Typography>
        <Box sx={{ minWidth: 0, wordBreak: 'break-word' }}>{children}</Box>
    </Stack>
);

Row.propTypes = { label: PropTypes.string, children: PropTypes.node };

export default function ActivityDetailsDrawer({ open, loading, log, onClose }) {
    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{ paper: { sx: { width: { xs: '100%', sm: 520 }, p: 0 } } }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
                <Typography variant="h6" fontWeight={700}>🔎 Детали события</Typography>
                <IconButton onClick={onClose}><CloseIcon /></IconButton>
            </Stack>
            <Divider />

            {loading && (
                <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>
            )}

            {!loading && log && (
                <Box sx={{ p: 2, overflowY: 'auto' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                        <Avatar sx={{ bgcolor: stringToColor(log.causer.name) }}>{initials(log.causer.name)}</Avatar>
                        <Box>
                            <Typography fontWeight={700}>{log.causer.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {dayjs(log.created_at).format('DD MMMM YYYY, HH:mm:ss')}
                            </Typography>
                        </Box>
                    </Stack>

                    <Row label="Событие"><ActivityEventChip event={log.event} label={log.event_label} /></Row>
                    <Row label="Описание"><Typography variant="body2">{log.description}</Typography></Row>

                    {log.subject && (
                        <>
                            <Row label="Раздел"><Chip size="small" label={log.subject.title} /></Row>
                            <Row label="Объект">
                                {log.subject.link ? (
                                    <Button component={Link} href={log.subject.link} size="small"
                                            endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}>
                                        {log.subject.label}
                                    </Button>
                                ) : (
                                    <Typography variant="body2">{log.subject.label ?? `#${log.subject.id}`}</Typography>
                                )}
                            </Row>
                        </>
                    )}

                    <Row label="IP-адрес">
                        <Typography variant="body2" fontFamily="monospace">{log.ip ?? '—'}</Typography>
                    </Row>
                    <Row label="Метод / URL">
                        <Typography variant="caption" fontFamily="monospace">
                            {log.method} {log.url}
                        </Typography>
                    </Row>
                    <Row label="User-Agent">
                        <Typography variant="caption" color="text.secondary">{log.user_agent ?? '—'}</Typography>
                    </Row>

                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                        📝 Изменённые данные
                    </Typography>
                    <ActivityDiff properties={log.properties} />
                </Box>
            )}
        </Drawer>
    );
}

ActivityDetailsDrawer.propTypes = {
    open: PropTypes.bool.isRequired,
    loading: PropTypes.bool,
    log: PropTypes.object,
    onClose: PropTypes.func.isRequired,
};

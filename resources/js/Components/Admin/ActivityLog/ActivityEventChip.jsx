import PropTypes from 'prop-types';
import { Chip } from '@mui/material';
import { getEventMeta } from './activityMeta.jsx';

export default function ActivityEventChip({ event, label, size = 'small' }) {
    const { label: metaLabel, color, Icon } = getEventMeta(event);

    return (
        <Chip
            size={size}
            color={color}
            variant="outlined"
            icon={<Icon sx={{ fontSize: 16 }} />}
            label={label ?? metaLabel}
            sx={{ fontWeight: 600, borderRadius: 1.5 }}
        />
    );
}

ActivityEventChip.propTypes = {
    event: PropTypes.string.isRequired,
    label: PropTypes.string,
    size: PropTypes.oneOf(['small', 'medium']),
};

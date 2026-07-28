import {
    Badge as BadgeBase,
    Typography as TypographyBase,
    Button as ButtonBase,
    Chip as ChipBase,
    Tooltip as TooltipBase,
    Avatar as AvatarBase,
    Paper as PaperBase,
    AppBar as AppBarBase,
    Link as LinkBase,
    CircularProgress as CircularProgressBase,
    LinearProgress as LinearProgressBase,
    Radio as RadioBase,
} from '@mui/material';
import { useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';

// ########################################################################
// Helpers
// ########################################################################
function getColor(color, theme, brightness = 'main') {
    if (color && theme.palette[color] && theme.palette[color][brightness]) {
        return theme.palette[color][brightness];
    }
    return undefined;
}

function getCustomBackgroundColor(color) {
    switch (color) {
        case 'primary':
            return 'rgba(83, 109, 254, .3)';
        case 'secondary':
            return 'rgba(255, 198, 208, 0.3)';
        case 'warning':
            return 'rgba(255, 219, 198, 0.3)';
        case 'success':
            return 'rgba(147, 212, 185, 0.3)';
        case 'info':
            return 'rgba(214, 172, 254, 0.3)';
        default:
            return '#C4D4FE';
    }
}

function getFontWeight(style) {
    switch (style) {
        case 'light':
            return 300;
        case 'medium':
            return 500;
        case 'bold':
            return 600;
        default:
            return 400;
    }
}

function getFontSize(size, variant = '', theme) {
    let multiplier;
    switch (size) {
        case 'sm':
            multiplier = 0.8;
            break;
        case 'md':
            multiplier = 1.5;
            break;
        case 'xl':
            multiplier = 2;
            break;
        case 'xxl':
            multiplier = 3;
            break;
        default:
            multiplier = 1;
            break;
    }

    const defaultSize =
        variant && theme.typography[variant]
            ? theme.typography[variant].fontSize
            : theme.typography.fontSize + 'px';

    return `calc(${defaultSize} * ${multiplier})`;
}

// ########################################################################
// Styled Components (вместо makeStyles)
// ########################################################################

const StyledBadge = styled(BadgeBase, {
    shouldForwardProp: (prop) =>
        !['colorBrightness', 'color', 'type'].includes(prop),
})(({ theme, colorBrightness, color, type }) => ({
    fontWeight: 600,
    height: type !== 'tag' ? 16 : 'auto',
    minWidth: type !== 'tag' ? 16 : 'auto',
    backgroundColor:
        type === 'tag'
            ? `${getColor(color, theme, colorBrightness) || theme.palette.primary.main}44`
            : getColor(color, theme, colorBrightness) || theme.palette.primary.main,
    color:
        type === 'tag'
            ? getColor(color, theme, colorBrightness) || theme.palette.primary.main
            : 'white',
    borderRadius: type === 'tag' ? 4 : undefined,
    padding: type === 'tag' ? '6px 6px' : undefined,
    position: type === 'tag' ? 'static' : undefined,
    transform: type === 'tag' ? 'none' : undefined,
    marginRight: type === 'tag' ? 10 : undefined,
    marginBottom: type === 'tag' ? 10 : undefined,
    alignContent: 'center',
}));

function Badge({ children, colorBrightness, color, type, ...props }) {
    return (
        <StyledBadge
            colorBrightness={colorBrightness}
            color={color}
            type={type}
            {...props}
        >
            {children}
        </StyledBadge>
    );
}

// ------------------------------------------------------------------------

const StyledChip = styled(ChipBase, {
    shouldForwardProp: (prop) => !['colorBrightness', 'color'].includes(prop),
})(({ theme, colorBrightness, color }) => ({
    backgroundColor:
        getColor(color, theme, colorBrightness) || theme.palette.primary.main,
    color: 'white',
}));

function Chip({ colorBrightness, color, ...props }) {
    return (
        <StyledChip colorBrightness={colorBrightness} color={color} {...props} />
    );
}

// ------------------------------------------------------------------------

function Typography({
                        children,
                        weight,
                        size,
                        colorBrightness,
                        color,
                        block,
                        uppercase,
                        style,
                        ...props
                    }) {
    const theme = useTheme();

    return (
        <TypographyBase
            sx={{
                color: getColor(color, theme, colorBrightness) || 'inherit',
                fontWeight: getFontWeight(weight),
                fontSize: getFontSize(size, props.variant, theme),
                textTransform: uppercase ? 'uppercase' : 'none',
                ...style,
            }}
            component={block ? 'div' : 'p'}
            {...props}
        >
            {children}
        </TypographyBase>
    );
}

// ------------------------------------------------------------------------

const StyledButton = styled(ButtonBase, {
    shouldForwardProp: (prop) => !['color', 'select'].includes(prop),
})(({ theme, color, select }) => {
    const mainColor = getColor(color, theme) || theme.palette.primary.main;

    return {
        color: mainColor,
        ...(select && {
            backgroundColor: theme.palette.primary.main,
            color: '#fff',
        }),
        '&.MuiButton-contained': {
            backgroundColor: mainColor,
            boxShadow: theme.customShadows?.widget,
            color:
                theme.palette.mode === 'dark' && !color
                    ? '#000'
                    : `${color ? 'white' : theme.palette.text.primary} !important`,
            '&:hover': {
                backgroundColor: getColor(color, theme, 'light') || mainColor,
                boxShadow: theme.customShadows?.widgetWide,
            },
            '&:active': {
                boxShadow: theme.customShadows?.widgetWide,
            },
        },
        '&.MuiButton-outlined': {
            color: mainColor,
            borderColor: mainColor,
        },
    };
});

function Button({ children, color, className, select, ...props }) {
    return (
        <StyledButton color={color} select={select} className={className} {...props}>
            {children}
        </StyledButton>
    );
}

// ------------------------------------------------------------------------

const StyledAvatar = styled(AvatarBase, {
    shouldForwardProp: (prop) => !['color', 'colorBrightness'].includes(prop),
})(({ theme, color, colorBrightness }) => ({
    backgroundColor:
        getColor(color, theme, colorBrightness) || theme.palette.primary.main,
}));

function Avatar({ children, color, colorBrightness, ...props }) {
    return (
        <StyledAvatar color={color} colorBrightness={colorBrightness} {...props}>
            {children}
        </StyledAvatar>
    );
}

// ------------------------------------------------------------------------

const StyledTooltip = styled(
    ({ color, ...props }) => <TooltipBase {...props} />,
    {
        shouldForwardProp: (prop) => prop !== 'color',
    }
)(({ theme, color }) => ({
    [`& .MuiTooltip-tooltip`]: {
        backgroundColor: getColor(color, theme) || theme.palette.primary.main,
        color: 'white',
    },
}));

function Tooltip({ children, color, ...props }) {
    return (
        <StyledTooltip color={color} {...props}>
            {children}
        </StyledTooltip>
    );
}

// ------------------------------------------------------------------------

const StyledPaper = styled(PaperBase, {
    shouldForwardProp: (prop) => prop !== 'color',
})(({ theme, color }) => ({
    backgroundColor: getColor(color, theme) || theme.palette.background.paper,
}));

function Paper({ children, color, ...props }) {
    return (
        <StyledPaper color={color} {...props}>
            {children}
        </StyledPaper>
    );
}

// ------------------------------------------------------------------------

const StyledAppBar = styled(AppBarBase, {
    shouldForwardProp: (prop) => prop !== 'color',
})(({ theme, color }) => ({
    backgroundColor: getColor(color, theme) || theme.palette.primary.main,
}));

function AppBar({ children, color, ...props }) {
    return (
        <StyledAppBar color={color} {...props}>
            {children}
        </StyledAppBar>
    );
}

// ------------------------------------------------------------------------

const StyledLink = styled(LinkBase, {
    shouldForwardProp: (prop) => prop !== 'color',
})(({ theme, color }) => ({
    color: color
        ? `${getColor(color, theme) || theme.palette.primary.main} !important`
        : theme.palette.text.primary,
    textDecoration: 'none',
}));

function Link({ children, color, ...props }) {
    return (
        <StyledLink color={color} {...props}>
            {children}
        </StyledLink>
    );
}

// ------------------------------------------------------------------------

const StyledCircularProgress = styled(CircularProgressBase, {
    shouldForwardProp: (prop) => prop !== 'color',
})(({ theme, color }) => ({
    color: color
        ? `${getColor(color, theme) || theme.palette.primary.main} !important`
        : theme.palette.primary.main,
}));

function CircularProgress({ color, ...props }) {
    return <StyledCircularProgress color={color} {...props} />;
}

// ------------------------------------------------------------------------

const StyledLinearProgress = styled(LinearProgressBase, {
    shouldForwardProp: (prop) => prop !== 'color',
})(({ theme, color }) => ({
    backgroundColor: getCustomBackgroundColor(color),
    '& .MuiLinearProgress-bar': {
        backgroundColor: color
            ? `${getColor(color, theme) || theme.palette.primary.main} !important`
            : theme.palette.primary.main,
    },
}));

function LinearProgress({ color, ...props }) {
    return <StyledLinearProgress color={color} {...props} />;
}

// ------------------------------------------------------------------------

const StyledRadio = styled(RadioBase)({
    color: 'green',
    '&.Mui-checked': {
        color: 'green',
    },
});

function Radio(props) {
    return <StyledRadio {...props} />;
}

// ########################################################################
// Exports
// ########################################################################
export {
    Badge,
    Typography,
    Button,
    Chip,
    Tooltip,
    Avatar,
    Paper,
    AppBar,
    Link,
    CircularProgress,
    LinearProgress,
    Radio,
};

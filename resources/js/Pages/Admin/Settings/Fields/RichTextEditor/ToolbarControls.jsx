import { memo } from 'react';
import { Box, IconButton, ToggleButton, Tooltip } from '@mui/material';

/**
 * Кнопка-переключатель панели инструментов.
 *
 * Почему не `<ToggleButtonGroup>` с `<Tooltip>` внутри:
 * ToggleButtonGroup клонирует ТОЛЬКО прямых потомков, добавляя им класс
 * `.MuiToggleButtonGroup-grouped`, `selected`, `size` и `onChange`.
 * Если обернуть кнопку в Tooltip, все эти пропсы прилетают Tooltip'у,
 * а групповые стили (склеенные границы, скругления по краям) не применяются —
 * получаются двойные рамки. Поэтому группировка сделана обычным Box,
 * который стилизует потомков по DOM-селектору: Tooltip не создаёт
 * собственного узла в разметке, так что селектор попадает точно в кнопку.
 *
 * @param {object}   props
 * @param {string}   props.title            текст подсказки
 * @param {boolean}  [props.active=false]   состояние «включено»
 * @param {() => void} props.onClick
 * @param {boolean}  [props.disabled=false]
 * @param {React.ReactNode} props.children  иконка
 */
export const ToolbarToggle = memo(function ToolbarToggle({
    title,
    active = false,
    onClick,
    disabled = false,
    children,
    ...props
}) {
    return (
        <Tooltip title={title} disableInteractive>
            {/* span нужен, чтобы Tooltip работал и на disabled-кнопке */}
            <span style={{ display: 'inline-flex' }}>
                <ToggleButton
                    {...props}
                    value={title}
                    size="small"
                    selected={active}
                    disabled={disabled}
                    // onMouseDown вместо onClick: предотвращаем потерю выделения
                    // в редакторе до того, как команда успеет отработать.
                    onMouseDown={(event) => event.preventDefault()}
                    onChange={onClick}
                    sx={{ px: 1, border: 0, borderRadius: 1 }}
                >
                    {children}
                </ToggleButton>
            </span>
        </Tooltip>
    );
});

/**
 * Обычная кнопка-действие (без состояния «нажато»).
 *
 * @param {object} props
 * @param {string} props.title
 * @param {() => void} props.onClick
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.highlighted=false] подсветить как активное
 */
export const ToolbarAction = memo(function ToolbarAction({
    title,
    onClick,
    disabled = false,
    highlighted = false,
    children,
}) {
    return (
        <Tooltip title={title} disableInteractive>
            <span style={{ display: 'inline-flex' }}>
                <IconButton
                    size="small"
                    disabled={disabled}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={onClick}
                    color={highlighted ? 'primary' : 'default'}
                >
                    {children}
                </IconButton>
            </span>
        </Tooltip>
    );
});

/** Визуальная группа кнопок со «склеенными» границами. */
export const ToolbarGroup = memo(function ToolbarGroup({ children }) {
    return (
        <Box
            sx={{
                display: 'inline-flex',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                '& > span > .MuiToggleButton-root': { borderRadius: 0 },
                '& > span:not(:first-of-type) > .MuiToggleButton-root': {
                    borderLeft: 1,
                    borderLeftColor: 'divider',
                },
            }}
        >
            {children}
        </Box>
    );
});

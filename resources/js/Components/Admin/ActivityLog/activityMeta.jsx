import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import SwapVertOutlinedIcon from '@mui/icons-material/SwapVertOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import PublicOffOutlinedIcon from '@mui/icons-material/PublicOffOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import GppBadOutlinedIcon from '@mui/icons-material/GppBadOutlined';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';

export const EVENT_META = {
    created:        { label: 'Создание',            color: 'success', Icon: AddCircleOutlineIcon },
    updated:        { label: 'Изменение',           color: 'info',    Icon: EditOutlinedIcon },
    deleted:        { label: 'Удаление',            color: 'warning', Icon: DeleteOutlineIcon },
    force_deleted:  { label: 'Удаление навсегда',   color: 'error',   Icon: DeleteForeverOutlinedIcon },
    restored:       { label: 'Восстановление',      color: 'success', Icon: RestoreOutlinedIcon },
    sorted:         { label: 'Сортировка',          color: 'default', Icon: SwapVertOutlinedIcon },
    published:      { label: 'Публикация',          color: 'success', Icon: PublicOutlinedIcon },
    unpublished:    { label: 'Снятие с публикации', color: 'warning', Icon: PublicOffOutlinedIcon },
    login:          { label: 'Вход',                color: 'primary', Icon: LoginOutlinedIcon },
    logout:         { label: 'Выход',               color: 'default', Icon: LogoutOutlinedIcon },
    login_failed:   { label: 'Неудачный вход',      color: 'error',   Icon: GppBadOutlinedIcon },
    registered:     { label: 'Регистрация',         color: 'secondary', Icon: PersonAddAlt1OutlinedIcon },
    password_reset: { label: 'Сброс пароля',        color: 'warning', Icon: KeyOutlinedIcon },
    imported:       { label: 'Импорт',              color: 'info',    Icon: UploadFileOutlinedIcon },
    exported:       { label: 'Экспорт',             color: 'info',    Icon: DownloadOutlinedIcon },
};

export const getEventMeta = (event) =>
    EVENT_META[event] ?? { label: event, color: 'default', Icon: HistoryOutlinedIcon };

/** Цвет аватара по строке (стабильный) */
export const stringToColor = (str = '') => {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 55%, 45%)`;
};

export const initials = (name = '?') =>
    name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

import {
    AccountCircle as AccountCircleIcon,
    Person as ProfileIcon,
    Home as HomeIcon,

} from '@mui/icons-material';

const structure = [
    { id: 100, label: 'Профиль', link: '/admin/profile', icon: <AccountCircleIcon /> },
    { id: 0, label: 'Главная панель', link: '/admin/dashboard', icon: <HomeIcon /> },
    { id: 1, label: 'Пользователи', link: '/admin/users', icon: <ProfileIcon /> },
];

export default structure;

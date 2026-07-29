import { useState, createContext, useContext } from 'react';
import {
    Fab,
    IconButton,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import GithubIcon from '@mui/icons-material/GitHub';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import classnames from 'classnames';
import { usePage } from '@inertiajs/react';

// Компоненты
import Header from '@admin-components/Header/Header';
import Sidebar from '@admin-components/Sidebar/Sidebar';
import BreadCrumbs from '@admin-components/BreadCrumbs';
import Footer from '@admin-components/Footer/Footer';
import { Link } from '@admin-components/Wrappers/Wrappers.jsx';
import ColorChangeThemePopper from '@admin-layouts/components/ColorChangeThemePopper.jsx';

// Стили
import useStyles from './styles';
import structure from './structure.jsx';

// Контекст
import { useLayoutState } from './context/LayoutContext';


export default function AdminLayout({ children, title = 'Панель администратора' }) {
    const classes = useStyles();
    // Для поппера смены темы
    const [anchorEl, setAnchorEl] = useState(null);

    const open = Boolean(anchorEl);
    const id = open ? 'add-section-popover' : undefined;
    const handleClick = (event) => {
        setAnchorEl(open ? null : event.currentTarget);
    };

    let layoutState = useLayoutState();

    // ================================================
    // Получаем данные из Inertia
    // ================================================
    const { auth, appName, flash, can } = usePage().props;
    const user = auth?.user; // Безопасное извлечение (если не авторизован)

    // Flash-сообщения можно показывать через Snackbar/Alert
    const defaultMessage = flash?.message;
    const successMessage = flash?.success;
    const errorMessage = flash?.error;

    // Проверка прав доступа
    // const canManageUsers = can?.manage_users;
    // const canManageSettings = can?.manage_settings;

    return (
        <div className={classes.root}>
                <Header title={title} user={user} />

                <Sidebar structure={structure}/>

                <div
                    className={classnames(classes.content, {
                        [classes.contentShift]: layoutState.isSidebarOpened,
                    })}
                >
                    <div className={classes.fakeToolbar} />
                    <BreadCrumbs />

                    {children}

                    <Fab
                        color='primary'
                        aria-label='settings'
                        onClick={(e) => handleClick(e)}
                        className={classes.changeThemeFab}
                        style={{ zIndex: 2000 }}
                    >
                        <SettingsIcon style={{ color: '#fff' }} />
                    </Fab>
                    <ColorChangeThemePopper id={id} open={open} anchorEl={anchorEl} />
                    <Footer>
                        <div>
                            <Link
                                color={'primary'}
                                href={'https://flatlogic.com/'}
                                target={'_blank'}
                                className={classes.link}
                            >
                                Flatlogic
                            </Link>
                            <Link
                                color={'primary'}
                                href={'https://flatlogic.com/about'}
                                target={'_blank'}
                                className={classes.link}
                            >
                                About Us
                            </Link>
                            <Link
                                color={'primary'}
                                href={'https://flatlogic.com/blog'}
                                target={'_blank'}
                                className={classes.link}
                            >
                                Blog
                            </Link>
                        </div>
                        <div>
                            <Link href={'https://www.facebook.com/flatlogic'} target={'_blank'}>
                                <IconButton aria-label='facebook'>
                                    <FacebookIcon style={{ color: '#6E6E6E99' }} />
                                </IconButton>
                            </Link>
                            <Link href={'https://twitter.com/flatlogic'} target={'_blank'}>
                                <IconButton aria-label='twitter'>
                                    <TwitterIcon style={{ color: '#6E6E6E99' }} />
                                </IconButton>
                            </Link>
                            <Link href={'https://github.com/flatlogic'} target={'_blank'}>
                                <IconButton
                                    aria-label='github'
                                    style={{ padding: '12px 0 12px 12px' }}
                                >
                                    <GithubIcon style={{ color: '#6E6E6E99' }} />
                                </IconButton>
                            </Link>
                        </div>
                    </Footer>
                </div>
            </div>
    );
}

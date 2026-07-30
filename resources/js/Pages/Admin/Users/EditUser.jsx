import React from 'react';
import {
    Grid,
    Box,
    TextField,
    FormControl,
    FormControlLabel,
    FormLabel
} from '@mui/material';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Checkbox from '@mui/material/Checkbox';
import Switch from '@mui/material/Switch';
import useStyles from './styles';

import {
    PersonOutline as PersonOutlineIcon,
    Lock as LockIcon,
    RadioButtonUnchecked as RadioButtonUncheckedIcon,
    RadioButtonChecked as RadioButtonCheckedIcon
} from '@mui/icons-material';

import AdminLayout from '@admin-layouts/AdminLayout';
import Widget from '@admin-components/Widget/Widget.jsx';
import {Typography, Button, Radio, RadioGroup} from '@mui/material';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';

import {useForm} from '@inertiajs/react';

const EditUser = ({user, isEditable = true}) => {
    const classes = useStyles();
    const [tab, setTab] = React.useState(0);
    const [password, setPassword] = React.useState({
        newPassword: '',
        confirmPassword: '',
        currentPassword: ''
    });

    const fileInput = React.useRef(null);
    const handleChangeTab = (event, newValue) => {
        setTab(newValue);
    };

    // useForm автоматически поддерживает файлы через FormData
    const {data, setData, put, post, processing, errors, clearErrors} = useForm({
        name: user?.name || '',
        firstName: user?.first_name || '',
        lastName: user?.last_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        role: user?.role || 'user',
        // Radio поле
        is_active: user?.is_active,
        avatar: null, // Здесь будет файл
        avatar_id: null, // Для удаления
        remove_avatar: false, // Флаг удаления аватара

    });

    // Обработка выбора файла
    const handleFile = (event) => {
        const file = event.target.files[0];
        if (file) {
            setData('avatar', file); // Просто передаем файл в useForm
        }
    };

    // Удаление аватара
    const deleteAvatar = () => {
        setData('avatar', null);
        setData('remove_avatar', true);
        if (fileInput.current) {
            fileInput.current.value = '';
        }
    };

    // Отмена удаления
    const cancelDeleteAvatar = () => {
        setData('remove_avatar', false);
        setData('avatar', null);
    };

    // Сохранение пользователя с аватаром
    function handleSubmit(e) {
        e.preventDefault();
        clearErrors();

        // useForm сам создаст FormData при наличии файлов
        put(`/admin/users/${user.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                // Сброс состояния после успешного сохранения
                if (data.avatar) {
                    setData('avatar', null);
                }
                // Очищаем поле ввода
                if (fileInput.current) {
                    fileInput.current.value = '';
                }
            },
            onError: (errors) => {
                console.error('Validation errors:', errors);
            }
        });
    }

    // Смена пароля
    function handleUpdatePassword(e) {
        e.preventDefault();

        post(`/admin/users/${user.id}/change-password`, {
            data: {
                current_password: password.currentPassword,
                new_password: password.newPassword,
                new_password_confirmation: password.confirmPassword
            },
            preserveScroll: true,
            onSuccess: () => {
                setPassword({
                    newPassword: '',
                    confirmPassword: '',
                    currentPassword: ''
                });
                // Показываем уведомление об успехе
            }
        });
    }

    function handleChangePassword(e) {
        setPassword({
            ...password,
            [e.target.name]: e.target.value
        });
    }

    function handleChange(e) {
        setData(e.target.name, e.target.value);
    }

    return (
        <AdminLayout title="Редактирование пользователя">
            <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
                <Grid size={12}>
                    <Widget>
                        <Box display={'flex'} justifyContent={'center'}>
                            <Tabs
                                indicatorColor='primary'
                                textColor='primary'
                                value={tab}
                                onChange={handleChangeTab}
                                aria-label='full width tabs example'>

                                <Tab
                                    label='АККАУНТ'
                                    icon={<PersonOutlineIcon/>}
                                    classes={{wrapper: classes.icon}}/>

                                <Tab
                                    label='ПРОФИЛЬ'
                                    icon={<PersonOutlineIcon/>}
                                    classes={{wrapper: classes.icon}}/>

                                <Tab
                                    label='СМЕНИТЬ ПАРОЛЬ'
                                    icon={<LockIcon/>}
                                    classes={{wrapper: classes.icon}}/>

                            </Tabs>
                        </Box>
                    </Widget>
                </Grid>
                <Grid size={12}>
                    <Widget>
                        <Grid justifyContent={'center'} container>
                            <Box display={'flex'} flexDirection={'column'} width={600}>
                                {tab === 0 ?
                                    <>
                                        <Typography
                                            variant={'h5'}
                                            weight={'medium'}
                                            style={{marginBottom: 30}}>
                                            Аккаунт
                                        </Typography>
                                        <TextField
                                            label='Никнейм'
                                            value={data?.name || ''}
                                            onChange={handleChange}
                                            name='firstName'
                                            variant='outlined'
                                            style={{marginBottom: 35}}
                                            error={!!errors.name}
                                            helperText={errors.name}
                                        />

                                        <TextField
                                            label='Email'
                                            value={data?.email || ''}
                                            name='email'
                                            onChange={handleChange}
                                            variant='outlined'
                                            style={{marginBottom: 35}}
                                            error={!!errors.email}
                                            helperText={errors.email}
                                            disabled/>

                                        <FormControl variant='outlined' style={{marginBottom: 35}}>
                                            <InputLabel id='demo-simple-select-outlined-label'>
                                                Роль
                                            </InputLabel>
                                            <Select
                                                labelId='demo-simple-select-outlined-label'
                                                label='Роль'
                                                id='demo-simple-select-outlined'
                                                value={data?.role || ''}
                                                name='role'
                                                onChange={handleChange}>

                                                <MenuItem value={'admin'}>Admin</MenuItem>
                                                <MenuItem value={'user'}>User</MenuItem>
                                                <MenuItem value={'editor'}>Editor</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <FormControl component="fieldset" sx={{ mb: 3 }}>
                                            <FormLabel component="legend">Активность</FormLabel>
                                            <RadioGroup
                                                row
                                                name="is_active"
                                                value={data.is_active}
                                                onChange={(e) => setData('is_aсtive', e.target.value)}
                                            >
                                                <FormControlLabel
                                                    control={
                                                        <Radio
                                                            checked={data.is_active === true}
                                                            onChange={() => setData('is_active', true)}
                                                            value={true}
                                                            color="primary"
                                                            icon={<RadioButtonUncheckedIcon fontSize="small" />}
                                                            checkedIcon={<RadioButtonCheckedIcon fontSize="small" />}
                                                        />
                                                    }
                                                    label="Активный"
                                                />
                                                <FormControlLabel
                                                    control={
                                                        <Radio
                                                            checked={data.is_active === false}
                                                            onChange={() => setData('is_active', false)}
                                                            value={false}
                                                            color="warning"
                                                            icon={<RadioButtonUncheckedIcon fontSize="small" />}
                                                            checkedIcon={<RadioButtonCheckedIcon fontSize="small" />}
                                                        />
                                                    }
                                                    label="Неактивный"
                                                />
                                            </RadioGroup>
                                        </FormControl>
                                    </> :
                                    tab === 1 ?
                                        <>
                                            <Typography
                                                variant={'h5'}
                                                weight={'medium'}
                                                style={{marginBottom: 35}}>
                                                Личная информация
                                            </Typography>

                                            {/* Аватар */}
                                            <Typography weight={'medium'}>Фото:</Typography>
                                            <div className={classes.galleryWrap}>
                                                {user?.avatar && !data.remove_avatar ? (
                                                    <div className={classes.imgWrap}>
                                                    <span
                                                        className={classes.deleteImageX}
                                                        onClick={deleteAvatar}>
                                                    </span>
                                                        <img
                                                            src={user.avatar_url}
                                                            alt='avatar'
                                                            height={'100%'} />
                                                    </div>
                                                ) : data.remove_avatar ? (
                                                    <Typography color='textSecondary'>
                                                        Аватар будет удален
                                                    </Typography>
                                                ) : null}
                                            </div>
                                            {data.remove_avatar ? (
                                                <Button
                                                    size='small'
                                                    onClick={cancelDeleteAvatar}
                                                    style={{ marginBottom: 10 }}>
                                                    Cancel removal
                                                </Button>
                                            ) : (
                                                <>
                                                    <label
                                                        className={classes.uploadLabel}
                                                        style={{ cursor: 'pointer' }}>
                                                        {'Загрузить изображение'}
                                                        <input
                                                            style={{ display: 'none' }}
                                                            accept='image/*'
                                                            type='file'
                                                            ref={fileInput}
                                                            onChange={handleFile} />
                                                    </label>
                                                    {data.avatar && (
                                                        <Typography variant='caption' color='primary'>
                                                            Выбранный файл: {data.avatar.name}
                                                        </Typography>
                                                    )}
                                                    {errors.avatar && (
                                                        <Typography color='error' variant='caption'>
                                                            {errors.avatar}
                                                        </Typography>
                                                    )}
                                                </>
                                            )}

                                            <Typography size={'sm'} style={{marginBottom: 35}}>
                                                .PNG, .JPG, .JPEG
                                            </Typography>

                                            <TextField
                                                label='Имя'
                                                variant='outlined'
                                                value={data && data.firstName}
                                                name='firstName'
                                                onChange={handleChange}
                                                style={{marginBottom: 35}}
                                                error={!!errors.firstName}
                                                helperText={errors.firstName}
                                            />

                                            <TextField
                                                label='Фамилия'
                                                variant='outlined'
                                                value={data && data.lastName}
                                                name='lastName'
                                                onChange={handleChange}
                                                style={{marginBottom: 35}}
                                                error={!!errors.lastName}
                                                helperText={errors.lastName}
                                            />

                                            <TextField
                                                label='Телефон'
                                                variant='outlined'
                                                style={{marginBottom: 35}}
                                                value={data && data.phone}
                                                name='phone'
                                                onChange={handleChange}
                                                error={!!errors.phone}
                                                helperText={errors.phone}
                                            />

                                            <TextField
                                                label='Email'
                                                variant='outlined'
                                                style={{marginBottom: 35}}
                                                type={'email'}
                                                value={data && data.email}
                                                name='email'
                                                onChange={handleChange}
                                                disabled/>

                                        </> :
                                        tab === 2 ?
                                            <>
                                                <Typography
                                                    variant={'h5'}
                                                    weight={'medium'}
                                                    style={{marginBottom: 35}}>
                                                    Пароль
                                                </Typography>
                                                <TextField
                                                    label='Текущий пароль'
                                                    type='password'
                                                    variant='outlined'
                                                    style={{marginBottom: 35}}
                                                    value={password.currentPassword || ''}
                                                    name='currentPassword'
                                                    onChange={handleChangePassword}/>

                                                <TextField
                                                    label='Новый пароль'
                                                    type='password'
                                                    variant='outlined'
                                                    style={{marginBottom: 35}}
                                                    value={password.newPassword || ''}
                                                    name='newPassword'
                                                    onChange={handleChangePassword}/>

                                                <TextField
                                                    label='Подтверждение пароля'
                                                    type='password'
                                                    variant='outlined'
                                                    style={{marginBottom: 35}}
                                                    value={password.confirmPassword || ''}
                                                    name='confirmPassword'
                                                    onChange={handleChangePassword}/>

                                            </> :

                                            <>
                                                <Typography
                                                    variant={'h5'}
                                                    weight={'medium'}
                                                    style={{marginBottom: 35}}>

                                                    Settings
                                                </Typography>
                                                <FormControl variant='outlined' style={{marginBottom: 35}}>
                                                    <Select
                                                        labelId='demo-simple-select-outlined-label'
                                                        id='demo-simple-select-outlined'
                                                        value={10}>

                                                        <MenuItem value={10}>English</MenuItem>
                                                        <MenuItem value={20}>Admin</MenuItem>
                                                        <MenuItem value={30}>Super Admin</MenuItem>
                                                    </Select>
                                                </FormControl>
                                                <Typography weight={'bold'}>Communication:</Typography>
                                                <Box display={'flex'}>
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox checked name='checkedB' color='secondary'/>
                                                        }
                                                        label='Email'/>

                                                    <FormControlLabel
                                                        control={<Checkbox name='checkedB' color='secondary'/>}
                                                        label='Messages'/>

                                                    <FormControlLabel
                                                        control={<Checkbox name='checkedB' color='secondary'/>}
                                                        label='Phone'/>

                                                </Box>
                                                <Box display={'flex'} mt={2} alignItems={'center'}>
                                                    <Typography weight={'medium'}>
                                                        Email notification
                                                    </Typography>
                                                    <Switch color={'primary'} checked/>
                                                </Box>
                                                <Box display={'flex'} mt={2} mb={2} alignItems={'center'}>
                                                    <Typography weight={'medium'}>
                                                        Send copy to personal email
                                                    </Typography>
                                                    <Switch color={'primary'}/>
                                                </Box>
                                            </>
                                }
                                {isEditable &&
                                    <Box display={'flex'} justifyContent={'space-between'}>
                                        {tab !== 2 ?
                                            <>
                                                <Button
                                                    variant={'outlined'}
                                                    color={'primary'}
                                                    onClick={() => {
                                                        setData('firstName', user?.firstName || '');
                                                        setData('lastName', user?.lastName || '');
                                                        setData('email', user?.email || '');
                                                        setData('phone', user?.phone || '');
                                                        setData('role', user?.role || 'user');
                                                        setData('avatar', null);
                                                        setData('remove_avatar', false);
                                                        if (fileInput.current) {
                                                            fileInput.current.value = '';
                                                        }
                                                    }}>
                                                    Reset
                                                </Button>
                                                <Button
                                                    variant={'contained'}
                                                    type='submit'
                                                    disabled={processing}>
                                                    {processing ? 'Saving...' : 'Save'}
                                                </Button>
                                            </> :
                                            <>
                                                <Button
                                                    variant={'outlined'}
                                                    color={'primary'}
                                                    onClick={() => {
                                                        setPassword({
                                                            newPassword: '',
                                                            confirmPassword: '',
                                                            currentPassword: ''
                                                        });
                                                    }}>
                                                    Reset
                                                </Button>
                                                <Button
                                                    variant={'contained'}
                                                    onClick={handleUpdatePassword}
                                                    disabled={processing}>
                                                    {processing ? 'Changing...' : 'Save Password'}
                                                </Button>
                                            </>
                                        }
                                    </Box>
                                }
                            </Box>
                        </Grid>
                    </Widget>
                </Grid>
            </Grid>
        </form>
        </AdminLayout>
    );
};

export default EditUser;

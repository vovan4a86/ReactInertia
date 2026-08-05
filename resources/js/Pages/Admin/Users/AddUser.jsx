import React, {useState, useRef} from 'react';
import {router, useForm} from '@inertiajs/react';
import {toast} from 'react-toastify';
import AdminLayout from '@admin-layouts/AdminLayout';


// ================================================
// 📌 MUI Components
// ================================================
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import Avatar from '@mui/material/Avatar';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { Delete as DeleteIcon, Upload as UploadIcon } from '@mui/icons-material';

// Стили
import useStyles from './styles';

// ================================================
// Кастомные компоненты админки
// ================================================
import {Button} from '@admin-components/Wrappers/Wrappers.jsx';
import Widget from '@admin-components/Widget/Widget.jsx';

// ================================================
// КОНСТАНТЫ ШАГОВ
// ================================================

/**
 * Шаги формы с заголовками
 */
const STEPS = [
    { label: 'Создание аккаунта', description: 'Базовая информация для входа' },
    { label: 'Данные пользователя', description: 'Личная информация и аватар' },
    { label: 'Бизнес-данные', description: 'Информация о компании' },
    { label: 'Социальные сети', description: 'Ссылки на профили' },
];

// ================================================
// ВАЛИДАЦИЯ НА КЛИЕНТЕ (опционально)
// ================================================

/**
 * Валидация полей текущего шага
 * @param {object} data - Данные формы
 * @param {number} step - Текущий шаг
 * @returns {object} Объект с ошибками
 */
const validateStep = (data, step) => {
    const errors = {};

    switch (step) {
        case 0:
            if (!data.fullName?.trim()) errors.fullName = 'Имя пользователя обязательно';
            if (!data.email?.trim()) errors.email = 'Email обязателен';
            else if (!/\S+@\S+\.\S+/.test(data.email)) errors.email = 'Неверный формат email';
            if (!data.password) errors.password = 'Пароль обязателен';
            else if (data.password.length < 6) errors.password = 'Минимум 6 символов';
            if (!data.role) errors.role = 'Выберите роль';
            break;
        case 1:
            if (!data.firstName?.trim()) errors.firstName = 'Имя обязательно';
            if (!data.lastName?.trim()) errors.lastName = 'Фамилия обязательна';
            if (!data.phoneNumber?.trim()) errors.phoneNumber = 'Телефон обязателен';
            break;
        case 2:
            if (!data.companyName?.trim()) errors.companyName = 'Название компании обязательно';
            if (!data.companyEmail?.trim()) errors.companyEmail = 'Email компании обязателен';
            break;
    }

    return errors;
};

// ================================================
// КОМПОНЕНТ ADDUSER
// ================================================
const AddUser = () => {
    const classes = useStyles();
    const fileInputRef = useRef(null); // Ref для input[type="file"]

    // ================================================
    // 1. СОСТОЯНИЕ ФОРМЫ (Inertia useForm)
    // ================================================
    // useForm автоматически обрабатывает ошибки валидации,
    // состояние отправки (processing) и недавно измененные поля
    const { data, setData, post, processing, errors, progress, reset } = useForm({
        // Аккаунт (шаг 0)
        fullName: '',
        email: '',
        password: '',
        role: 'user',

        // Персональные данные (шаг 1)
        firstName: '',
        lastName: '',
        phoneNumber: '',
        country: '',
        state: '',
        city: '',
        address: '',

        // Бизнес-данные (шаг 2)
        companyName: '',
        companyRegId: '',
        companyEmail: '',
        companyContact: '',

        // Социальные сети (шаг 3)
        facebook: '',
        twitter: '',
        instagram: '',
        github: '',
        codepen: '',
        slack: '',

        // Аватар (File объект для Inertia)
        avatar: null,
        avatarPreview: null, // Только для UI (base64)
    });

    // ================================================
    // 2. СОСТОЯНИЕ STEPPER
    // ================================================
    const [activeStep, setActiveStep] = useState(0);
    const [skipped, setSkipped] = useState(new Set());
    const [stepErrors, setStepErrors] = useState({});

    // ================================================
    // 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ================================================

    /**
     * Проверка, пропущен ли шаг
     */
    const isStepSkipped = (step) => skipped.has(step);

    /**
     * Проверка, является ли шаг опциональным
     */
    const isStepOptional = (step) => step === 2 || step === 3;

    // ================================================
    // 4. ОБРАБОТЧИКИ ИЗМЕНЕНИЯ ПОЛЕЙ
    // ================================================

    /**
     * Универсальный обработчик изменения полей формы
     * Автоматически очищает ошибку поля при изменении
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setData(name, value);

        // Очищаем ошибку конкретного поля, если она была
        if (stepErrors[name]) {
            setStepErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    // ================================================
    // 5. ЗАГРУЗКА АВАТАРА (через Inertia FormData)
    // ================================================

    /**
     * Обработчик выбора файла аватара
     * Файл сохраняется в data.avatar, Inertia сам создаст FormData при отправке
     */
    const handleAvatarSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Валидация на клиенте
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error('Пожалуйста, выберите изображение (JPEG, PNG, GIF, WebP)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Размер файла не должен превышать 5MB');
            return;
        }

        // ✅ Сохраняем САМ ФАЙЛ в data (Inertia автоматически создаст FormData)
        setData('avatar', file);

        // Создаем preview ТОЛЬКО для UI (не отправляется на сервер)
        const reader = new FileReader();
        reader.onloadend = () => {
            setData('avatarPreview', reader.result);
        };
        reader.readAsDataURL(file);
    };

    /**
     * Удаление выбранного аватара
     */
    const handleAvatarRemove = () => {
        setData({
            ...data,
            avatar: null,
            avatarPreview: null,
        });

        // Сбрасываем input[type="file"]
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // ================================================
    // 7. НАВИГАЦИЯ ПО ШАГАМ STEPPER
    // ================================================

    /**
     * Переход к следующему шагу
     * На последнем шаге — отправка формы
     */
    const handleNext = () => {
        // Валидация текущего шага перед переходом
        const validationErrors = validateStep(data, activeStep);

        if (Object.keys(validationErrors).length > 0) {
            setStepErrors(validationErrors);
            toast.warning('Пожалуйста, заполните обязательные поля');
            return;
        }

        // Очищаем ошибки
        setStepErrors({});

        // Если это последний шаг — отправляем форму
        if (activeStep === STEPS.length - 1) {
            handleSubmit();
            return;
        }

        // Обработка пропущенных шагов
        let newSkipped = skipped;
        if (isStepSkipped(activeStep)) {
            newSkipped = new Set(newSkipped.values());
            newSkipped.delete(activeStep);
        }

        // Переход к следующему шагу
        setActiveStep((prev) => prev + 1);
        setSkipped(newSkipped);
    };

    /**
     * Возврат к предыдущему шагу
     */
    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
        setStepErrors({}); // Очищаем ошибки при возврате
    };

    /**
     * Пропуск опционального шага
     */
    const handleSkip = () => {
        if (!isStepOptional(activeStep)) return;

        setActiveStep((prev) => prev + 1);
        setSkipped((prev) => {
            const newSkipped = new Set(prev.values());
            newSkipped.add(activeStep);
            return newSkipped;
        });
    };

    // ================================================
    // 8. ОТПРАВКА ФОРМЫ ЧЕРЕЗ INERTIA
    // ================================================

    /**
     * Отправка формы на сервер
     * Inertia автоматически создаст FormData, так как в data есть File (avatar)
     */
    const handleSubmit = () => {
        post('/admin/users', {
            // ✅ Inertia сам обработает FormData, CSRF, сессии

            // При успешном создании
            onSuccess: (response) => {
                toast.success('Пользователь успешно создан! 🎉');

                // Редирект на список пользователей (без перезагрузки страницы)
                router.visit('/admin/users');
            },

            // При ошибке валидации (Laravel вернет ошибки)
            onError: (errors) => {
                toast.error('Пожалуйста, проверьте правильность заполнения полей');
                console.error(errors);

                // Если ошибки на разных шагах — переходим на первый шаг с ошибкой
                const errorFields = Object.keys(errors);
                const stepFieldsMap = {
                    0: ['fullName', 'email', 'password', 'role'],
                    1: ['firstName', 'lastName', 'phoneNumber', 'country', 'state', 'city', 'address', 'avatar'],
                    2: ['companyName', 'companyRegId', 'companyEmail', 'companyContact'],
                    3: ['social_vk', 'social_max', 'social_telegram', 'social_github'],
                };

                // Находим первый шаг с ошибкой
                for (let i = 0; i < STEPS.length; i++) {
                    if (errorFields.some(field => stepFieldsMap[i].includes(field))) {
                        setActiveStep(i);
                        break;
                    }
                }
            },

            // При завершении (успех или ошибка)
            onFinish: () => {
                console.log('Запрос завершен');
            },
        });
    };

    // ================================================
    // 9. РЕНДЕР ПОЛЕЙ ПО ШАГАМ
    // ================================================

    /**
     * Рендер полей шага 0: Создание аккаунта
     */
    const renderAccountStep = () => (
        <>
            <TextField
                fullWidth
                label="Имя пользователя"
                name="fullName"
                value={data.fullName}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                error={!!errors.fullName || !!stepErrors.fullName}
                helperText={errors.fullName || stepErrors.fullName || 'Введите имя пользователя'}
                required
            />

            <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={data.email}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                error={!!errors.email || !!stepErrors.email}
                helperText={errors.email || stepErrors.email || 'Мы никогда не передадим ваш email третьим лицам'}
                required
            />

            <TextField
                fullWidth
                label="Пароль"
                name="password"
                type="password"
                value={data.password}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                error={!!errors.password || !!stepErrors.password}
                helperText={errors.password || stepErrors.password || 'Минимум 6 символов'}
                required
            />

            <FormControl fullWidth variant="outlined" sx={{ mb: 3 }} error={!!errors.role || !!stepErrors.role}>
                <InputLabel id="role-label">Роль</InputLabel>
                <Select
                    labelId="role-label"
                    name="role"
                    value={data.role}
                    onChange={handleChange}
                    variant="outlined"
                    label="Роль"
                >
                    <MenuItem value="user">Пользователь</MenuItem>
                    <MenuItem value="admin">Администратор</MenuItem>
                    <MenuItem value="manager">Менеджер</MenuItem>
                </Select>
                <FormHelperText>
                    {errors.role || stepErrors.role || 'Выберите роль пользователя'}
                </FormHelperText>
            </FormControl>
        </>
    );

    /**
     * Рендер полей шага 1: Данные пользователя
     */
    const renderProfileStep = () => (
        <>
            {/* === Загрузка аватара === */}
            <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
                Фото профиля
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {/* Превью аватара */}
                <Avatar
                    src={data.avatarPreview}
                    sx={{ width: 100, height: 100, fontSize: 40 }}
                >
                    {!data.avatarPreview && (data.firstName?.[0] || '?' )}
                </Avatar>

                {/* Кнопки управления */}
                <Box>
                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadIcon />}
                        disabled={processing}
                        sx={{ mb: 1 }}
                    >
                        Загрузить фото
                        <input
                            type="file"
                            hidden
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleAvatarSelect}
                        />
                    </Button>

                    {data.avatarPreview && (
                        <Button
                            variant="text"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={handleAvatarRemove}
                            disabled={processing}
                            size="small"
                        >
                            Удалить
                        </Button>
                    )}
                </Box>
            </Box>

            {errors.avatar && (
                <Typography color="error" variant="caption" sx={{ mb: 2, display: 'block' }}>
                    {errors.avatar}
                </Typography>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
                Поддерживаются форматы: JPEG, PNG, GIF, WebP. Максимальный размер: 5MB
            </Typography>

            {/* === Личные данные === */}
            <TextField
                fullWidth
                label="Имя"
                name="firstName"
                value={data.firstName || ''}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                error={!!errors.firstName || !!stepErrors.firstName}
                helperText={errors.firstName || stepErrors.firstName || 'Введите ваше имя'}
                required
            />

            <TextField
                fullWidth
                label="Фамилия"
                name="lastName"
                value={data.lastName || ''}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                error={!!errors.lastName || !!stepErrors.lastName}
                helperText={errors.lastName || stepErrors.lastName || 'Введите вашу фамилию'}
                required
            />

            <TextField
                fullWidth
                label="Номер телефона"
                name="phoneNumber"
                value={data.phoneNumber || ''}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                error={!!errors.phoneNumber || !!stepErrors.phoneNumber}
                helperText={errors.phoneNumber || stepErrors.phoneNumber || 'Например: +7 (999) 123-45-67'}
                placeholder="+7 (999) 123-45-67"
            />

            <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={data.email || ''}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                helperText="Email из первого шага"
                InputProps={{ readOnly: true }}
            />

            {/* === Местоположение === */}
            <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                <InputLabel id="country-label">Страна</InputLabel>
                <Select
                    labelId="country-label"
                    name="country"
                    value={data.country}
                    onChange={handleChange}
                    variant="outlined"
                    label="Страна"
                >
                    <MenuItem value="RU">Россия</MenuItem>
                    <MenuItem value="CN">Китая</MenuItem>
                    <MenuItem value="BR">Бразилия</MenuItem>
                    <MenuItem value="IR">Иран</MenuItem>
                </Select>
                <FormHelperText>Выберите страну</FormHelperText>
            </FormControl>

            <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                <InputLabel id="state-label">Регион/Штат</InputLabel>
                <Select
                    labelId="state-label"
                    name="state"
                    value={data.state}
                    onChange={handleChange}
                    variant="outlined"
                    label="Регион/Штат"
                >
                    <MenuItem value="kirov_obl">Кировская область</MenuItem>
                    <MenuItem value="moscow_reg">Московская область</MenuItem>
                    <MenuItem value="spb_reg">Ленинградская область</MenuItem>
                    <MenuItem value="ekb_reg">Свердловская область</MenuItem>
                </Select>
                <FormHelperText>Выберите регион</FormHelperText>
            </FormControl>

            <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                <InputLabel id="city-label">Город</InputLabel>
                <Select
                    labelId="city-label"
                    name="city"
                    value={data.city}
                    onChange={handleChange}
                    variant="outlined"
                    label="Город"
                >
                    <MenuItem value="kirov">Киров</MenuItem>
                    <MenuItem value="moscow">Москва</MenuItem>
                    <MenuItem value="spb">Санкт-Петербург</MenuItem>
                    <MenuItem value="ekb">Екатеринбург</MenuItem>
                </Select>
                <FormHelperText>Выберите город</FormHelperText>
            </FormControl>

            <TextField
                fullWidth
                label="Адрес"
                name="address"
                value={data.address || ''}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                multiline
                rows={2}
                helperText="Введите полный адрес"
            />
        </>
    );

    /**
     * Рендер полей шага 2: Бизнес-данные
     */
    const renderBusinessStep = () => (
        <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Этот шаг опциональный. Вы можете пропустить его.
            </Typography>

            <TextField
                fullWidth
                label="Название компании"
                name="companyName"
                value={data.companyName || ''}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                error={!!stepErrors.companyName}
                helperText={stepErrors.companyName || 'Введите название компании'}
            />

            <TextField
                fullWidth
                label="Регистрационный номер компании"
                name="companyRegId"
                value={data.companyRegId || ''}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                helperText="Например: ИНН, ОГРН"
            />

            <TextField
                fullWidth
                label="Email компании"
                name="companyEmail"
                type="email"
                value={data.companyEmail || ''}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                error={!!stepErrors.companyEmail}
                helperText={stepErrors.companyEmail || 'Введите email компании'}
            />

            <TextField
                fullWidth
                label="Телефон компании"
                name="companyContact"
                value={data.companyContact || ''}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                helperText="Контактный телефон компании"
            />
        </>
    );

    /**
     * Рендер полей шага 3: Социальные сети
     */
    const renderSocialStep = () => (
        <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Этот шаг опциональный. Добавьте ссылки на профили в социальных сетях.
            </Typography>

            <TextField
                fullWidth
                label="VK"
                name="social_vk"
                value={data.social_vk || ''}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                placeholder="https://vk.com/username"
                helperText="Ссылка на профиль VK"
            />

            <TextField
                fullWidth
                label="MAX"
                name="social_max"
                value={data.social_max || ''}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                placeholder="https://max.ru/username"
                helperText="Ссылка на профиль MAX"
            />

            <TextField
                fullWidth
                label="Telegram"
                name="social_telegram"
                value={data.social_telegram || ''}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                placeholder="https://tg.me/username"
                helperText="Ссылка на профиль Telegram"
            />

            <TextField
                fullWidth
                label="GitHub"
                name="social_github"
                value={data.social_github || ''}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 3 }}
                placeholder="https://github.com/username"
                helperText="Ссылка на профиль GitHub"
            />
        </>
    );

    /**
     * Рендер содержимого текущего шага
     */
    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return renderAccountStep();
            case 1:
                return renderProfileStep();
            case 2:
                return renderBusinessStep();
            case 3:
                return renderSocialStep();
            default:
                return null;
        }
    };

    // ================================================
    // 📌 9. ГЛАВНЫЙ РЕНДЕР
    // ================================================

    return (
        <AdminLayout title="Добавление пользователя">
            <Grid container spacing={3}>
            {/* Stepper (индикатор шагов) */}
            <Grid size={12}>
                <Widget>
                    <Stepper activeStep={activeStep} alternativeLabel>
                        {STEPS.map((step, index) => {
                            const stepProps = {};
                            const labelProps = {};

                            // Если шаг пропущен, помечаем его
                            if (isStepSkipped(index)) {
                                stepProps.completed = false;
                            }

                            // Если шаг опциональный, добавляем текст
                            if (isStepOptional(index)) {
                                labelProps.optional = (
                                    <Typography variant="caption" color="text.secondary">
                                        Опционально
                                    </Typography>
                                );
                            }

                            return (
                                <Step key={step.label} {...stepProps}>
                                    <StepLabel
                                        {...labelProps}
                                        classes={{ completed: classes?.stepCompleted }}
                                    >
                                        {step.label}
                                    </StepLabel>
                                </Step>
                            );
                        })}
                    </Stepper>
                </Widget>
            </Grid>

            {/* Содержимое текущего шага */}
            <Grid size={12}>
                <Widget>
                    <Box sx={{ maxWidth: 600, mx: 'auto', py: 2 }}>
                        {/* Прогресс загрузки (встроен в Inertia!) */}
                        {progress && (
                            <Box sx={{ mb: 3 }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={progress.percentage}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                    {progress.percentage < 100
                                        ? `Загрузка: ${progress.percentage}%`
                                        : 'Обработка на сервере...'}
                                </Typography>
                            </Box>
                        )}

                        {/* Заголовок шага */}
                        <Typography variant="h5" fontWeight="medium" sx={{ mb: 1 }}>
                            {STEPS[activeStep].label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                            {STEPS[activeStep].description}
                        </Typography>

                        {/* Поля текущего шага */}
                        {renderStepContent(activeStep)}

                        {/* Кнопки навигации */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                            {/* Кнопка "Назад" */}
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={handleBack}
                                disabled={activeStep === 0 || processing}
                            >
                                Назад
                            </Button>

                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {/* Кнопка "Пропустить" (для опциональных шагов) */}
                                {isStepOptional(activeStep) && (
                                    <Button
                                        variant="text"
                                        color="secondary"
                                        onClick={handleSkip}
                                        disabled={processing}
                                    >
                                        Пропустить
                                    </Button>
                                )}

                                {/* Кнопка "Далее" / "Создать" */}
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleNext}
                                    disabled={processing}
                                >
                                    {activeStep === STEPS.length - 1
                                        ? processing
                                            ? 'Создание...'
                                            : 'Создать пользователя'
                                        : 'Далее'}
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Widget>
            </Grid>
        </Grid>
        </AdminLayout>
    );

};

export default AddUser;

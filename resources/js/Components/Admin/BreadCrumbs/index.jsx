import React from 'react';
import Widget from '../Widget/Widget';
import { Box, Grid, Breadcrumbs, Tabs, Tab } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Typography, Button } from '../Wrappers/Wrappers';
import {
  NavigateNext as NavigateNextIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { Link as InertiaLink } from '@inertiajs/react';

// styles
import useStyles from '@admin-layouts/styles';

// components
import sidebarConfig from "@/Layouts/Admin/sidebarConfig.jsx";

// Tab styling
const CustomTab = styled(Tab)(() => ({
  minWidth: 72,
  textTransform: 'none',
  fontWeight: 400,
}));

const BreadCrumbs = () => {
  const classes = useStyles();
  const [value, setValue] = React.useState(2);

    // Словарь для перевода путей
  const routeTranslations = {
        'admin': 'Главная',
        'dashboard': 'Панель управления',
        'users': 'Пользователи',
        'products': 'Товары',
        'categories': 'Категории',
        'orders': 'Заказы',
        'settings': 'Настройки',
        'profile': 'Профиль',
        'reports': 'Отчеты',
        'analytics': 'Аналитика',
        'messages': 'Сообщения',
        'notifications': 'Уведомления',
        'create': 'Создание',
        'edit': 'Редактирование',
        'group': 'Группа',
        'items': 'Элементы',
        'pages': 'Структура сайта'
    };

  const renderBreadCrumbs = () => {
    let url = location.pathname;
      let route = url
          .split('/')
          .slice(1)
          .map((route) => {
              // Сначала форматируем как раньше
              const formattedRoute = route
                  .split('-')
                  .map((word) => word[0]?.toUpperCase() + word.slice(1))
                  .join(' ');

              // применяем перевод, если он есть
              return routeTranslations[route.toLowerCase()] || formattedRoute;
          });

    const length = route.length;
    return route.map((item, index) => {
      let middlewareUrl =
        '/' +
        url
          .split('/')
          .slice(1, index + 2)
          .join('/');

      return (
        <Breadcrumbs
          key={index + '_b'}
          separator={<NavigateNextIcon fontSize='small' />}
          aria-label='breadcrumb'
        >
          <Typography
            variant='h6'
            color={length === index + 1 ? 'primary' : ''}
          >
            {length === index + 1 ? (
              item
            ) : (
              <InertiaLink
                href={middlewareUrl}
                style={{ color: 'unset', textDecoration: 'none' }}
              >
                {item}
              </InertiaLink>
            )}
          </Typography>
        </Breadcrumbs>
      );
    });
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const date = () => {
    let dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    let d = new Date()
    let year = d.getFullYear()
    let month = d.getMonth()
    let date = d.getDate()
    let day = d.getDay() + 1
    return `${date} ${monthNames[month]} ${year}, ${dayNames[day - 1]}`
  }

  function a11yProps(index) {
    return {
      id: `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  }
  return (
    <Widget
      disableWidgetMenu
      inheritHeight
      className={classes.margin}
      bodyClass={classes.navPadding}
    >
      <Grid
        container
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        wrap={'nowrap'}
        style={{ overflowX: 'auto' }}
      >
        {

            sidebarConfig.map((c) => {
            if (
              location.pathname.includes(c.link) &&
              c.link &&
              c.id === 'Dashboard'
            ) {
              return (
                <Box display='flex' alignItems='center' key={c.id}>
                  <Breadcrumbs aria-label='breadcrumb'>
                    <Typography variant='h4'>{c.label}</Typography>
                  </Breadcrumbs>
                  {location.pathname.includes('/admin/dashboard') && (
                    <Tabs
                      value={value}
                      onChange={handleChange}
                      aria-label='simple tabs example'
                      variant='scrollable'
                      scrollButtons='auto'
                      style={{ marginLeft: 38 }}
                    >
                      <CustomTab label='Сегодня' {...a11yProps(0)} />
                      <CustomTab label='Эта неделя' {...a11yProps(1)} />
                      <CustomTab label='Этот месяц' {...a11yProps(2)} />
                      <CustomTab label='Этот год' {...a11yProps(3)} />
                    </Tabs>
                  )}
                </Box>
              );
            }
          })
        }
        {location.pathname.includes('/admin/dashboard') ? (
          <Box display='flex' alignItems='center'>
            <CalendarIcon className={classes.calendarIcon} />
            <Typography className={classes.date} style={{ marginRight: 38 }}>
              {/*29 Oct 2019, Tuesday*/}
              {date()}
            </Typography>
            <Button
              variant='contained'
              color='secondary'
              className={classes.button}
            >
              Последние отчеты
            </Button>
          </Box>
        ) : (
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize='small' />}
            aria-label='breadcrumb'
          >
            {renderBreadCrumbs()}
          </Breadcrumbs>
        )}
      </Grid>
    </Widget>
  );
};

export default BreadCrumbs;

import { useState, useEffect, useMemo } from 'react';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { Drawer, IconButton, List } from '@mui/material';
import { useTheme } from '@mui/material';
import classNames from 'classnames';

// styles
import useStyles from './styles';

// components
import SidebarLink from './components/SidebarLink/SidebarLink_oldn.jsx';

// context
import {
  useLayoutState,
  useLayoutDispatch,
  toggleSidebar,
} from '@admin-layouts/context/LayoutContext';

function Sidebar({ structure, onToggle, onToggleGroup, expandedGroups, isLinkActive, currentUrl }) {
  let classes = useStyles();
  let theme = useTheme();

  const toggleDrawer = (value) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }

    if (value && !isPermanent) toggleSidebar(layoutDispatch);
  };

  // global
  let { isSidebarOpened } = useLayoutState();
  let layoutDispatch = useLayoutDispatch();

  // local
  let [isPermanent, setPermanent] = useState(true);

  const isSidebarOpenedWrapper = useMemo(
    () => (!isPermanent ? !isSidebarOpened : isSidebarOpened),
    [isPermanent, isSidebarOpened],
  );

  useEffect(function () {
    window.addEventListener('resize', handleWindowWidthChange);
    handleWindowWidthChange();
    return function cleanup() {
      window.removeEventListener('resize', handleWindowWidthChange);
    };
  });

  return (
    <Drawer
      variant={isPermanent ? 'permanent' : 'temporary'}
      className={classNames(classes.drawer, {
        [classes.drawerOpen]: isSidebarOpenedWrapper,
        [classes.drawerClose]: !isSidebarOpenedWrapper,
      })}
      classes={{
        paper: classNames({
          [classes.drawerOpen]: isSidebarOpenedWrapper,
          [classes.drawerClose]: !isSidebarOpenedWrapper,
        }),
      }}
      open={isSidebarOpenedWrapper}
      onClose={toggleDrawer(true)}
    >
      <div className={classes.toolbar} />
      <div className={classes.mobileBackButton}>
        <IconButton onClick={() => toggleSidebar(layoutDispatch)}>
          <ArrowBackIcon
            classes={{
              root: classNames(classes.headerIcon, classes.headerIconCollapse),
            }}
          />
        </IconButton>
      </div>
      <List
        className={classes.sidebarList}
        classes={{ padding: classes.padding }}
      >
        {structure.map(link => (
          <SidebarLink
            key={link.id}
            // location={currentUrl}
              isLinkActive={isLinkActive}
            expandedGroups={expandedGroups}
            isSidebarOpened={!isPermanent ? !isSidebarOpened : isSidebarOpened}
            {...link}
            toggleDrawer={toggleDrawer(true)}
          />
        ))}
      </List>
    </Drawer>
  );

  // ##################################################################
  function handleWindowWidthChange() {
    let windowWidth = window.innerWidth;
    let breakpointWidth = theme.breakpoints.values.md;
    let isSmallScreen = windowWidth < breakpointWidth;

    if (isSmallScreen && isPermanent) {
      setPermanent(false);
    } else if (!isSmallScreen && !isPermanent) {
      setPermanent(true);
    }
  }
}

export default Sidebar;

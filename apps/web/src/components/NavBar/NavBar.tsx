'use client';

import React from 'react';

import NavBarBrand from './NavBarBrand';
import NavBarLeftButtons from './NavBarLeftButtons';
import NavBarRightButtons from './NavBarRightButtons';

import styles from '../../styles/components/NavBar/NavBar.module.scss';

const NavBar: React.FC = () => {
  return (
    <nav className={styles.navbar}>
      <NavBarBrand />
      <NavBarLeftButtons />
      <NavBarRightButtons />
    </nav>
  );
};

export default NavBar;

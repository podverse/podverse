'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import NavArrowButton from '../NavArrowButton/NavArrowButton';

import styles from '../../styles/components/NavBar/NavBarLeftButtons.module.scss';

const NavBarLeftButtons: React.FC = () => {
  const router = useRouter();

  return (
    <div className={styles.leftButtons}>
      <NavArrowButton direction="left" onClick={router.back} ariaLabel="Back" />
      <NavArrowButton direction="right" onClick={router.forward} ariaLabel="Forward" />
    </div>
  );
};

export default NavBarLeftButtons;

'use client';

import Link from 'next/link';
import React from 'react';
import { FaMagnifyingGlass } from 'react-icons/fa6';

import { ROUTES } from '../../constants/routes';

import styles from '../../styles/components/NavBar/NavBarSearchButton.module.scss';

const NavBarSearchButton: React.FC = () => (
  <Link href={ROUTES.SEARCH} className={styles.button} aria-label="Search">
    <FaMagnifyingGlass />
  </Link>
);

export default NavBarSearchButton;

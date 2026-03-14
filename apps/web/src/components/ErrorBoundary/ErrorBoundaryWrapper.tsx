'use client';

import type { ReactNode } from 'react';
import React from 'react';

import { ErrorBoundary } from './ErrorBoundary';

type ErrorBoundaryWrapperProps = {
  children: ReactNode;
};

export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({ children }) => {
  return <ErrorBoundary>{children}</ErrorBoundary>;
};

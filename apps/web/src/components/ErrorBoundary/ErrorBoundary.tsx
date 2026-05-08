'use client';

import { useTranslations } from 'next-intl';
import type { ErrorInfo, ReactNode } from 'react';
import React, { Component } from 'react';

import { ErrorBoundaryShell } from '@podverse/ui';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return <ErrorBoundaryFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

type ErrorBoundaryFallbackProps = {
  error: Error;
  resetError: () => void;
};

const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({ error, resetError }) => {
  const tErrors = useTranslations('errors');
  const tMisc = useTranslations('misc');

  return (
    <ErrorBoundaryShell
      title={tErrors('boundary_title')}
      message={tErrors('boundary_message')}
      tryAgainLabel={tMisc('try_again')}
      reloadLabel={tMisc('reload_page')}
      detailsSummaryLabel={tErrors('details_development_only')}
      error={error}
      onReset={resetError}
      showDetails={process.env.NODE_ENV === 'development'}
    />
  );
};

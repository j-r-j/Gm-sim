/**
 * ErrorBoundary Component
 * Catches React rendering errors and displays a fallback UI
 */

import React from 'react';
import { ErrorScreen } from './ErrorScreen';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback UI */
  fallback?: React.ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Handler for "Go to Dashboard" escape hatch */
  onGoToDashboard?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches rendering errors in child components.
 * Displays the ErrorScreen with retry and dashboard escape options.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorScreen
          error={this.state.error ?? 'An unexpected error occurred'}
          onRetry={this.handleRetry}
          onGoBack={this.props.onGoToDashboard}
          title="Something went wrong"
          testID="error-boundary-screen"
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

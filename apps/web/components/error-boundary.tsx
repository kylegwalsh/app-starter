'use client';

import { analytics } from '@repo/analytics';
import Link from 'next/link';
import { Component, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/** A custom error boundary component that catches errors and displays a fallback UI */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Capture the error
  public componentDidCatch(error: Error) {
    console.log('Error boundary caught error', error);
    void analytics.captureException(error);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-background flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md text-center">
            <div className="text-primary mx-auto h-12 w-12" />
            <h1 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Oops, something went wrong!
            </h1>
            <p className="text-muted-foreground mt-4">
              We're sorry, but an unexpected error has occurred. Please try again later or contact
              support if the issue persists.
            </p>
            <div className="mt-6">
              <Link
                href="#"
                onClick={() => window.location.reload()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
                prefetch={false}>
                Reload page
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

'use client';

import { analytics } from '@repo/analytics';
import Link from 'next/link';
import { Component, type ReactNode } from 'react';

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
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Capture the error
  componentDidCatch(error: Error) {
    analytics.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 font-bold text-3xl text-foreground tracking-tight sm:text-4xl">
              Oops, something went wrong!
            </h1>
            <p className="mt-4 text-muted-foreground">
              We're sorry, but an unexpected error has occurred. Please try
              again later or contact support if the issue persists.
            </p>
            <div className="mt-6">
              <Link
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                href="#"
                onClick={() => window.location.reload()}
                prefetch={false}
              >
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

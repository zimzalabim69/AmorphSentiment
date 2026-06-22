"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[var(--color-bat-black)] p-6 text-center">
          <div className="text-4xl">💥</div>
          <h2 className="text-lg font-bold text-[var(--color-bat-red)]">Something went wrong</h2>
          <p className="max-w-md text-sm text-[var(--color-bat-dim)]">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="rounded border border-[var(--color-bat-border)] px-4 py-2 text-sm text-[var(--color-bat-text)] transition hover:border-[var(--color-bat-orange)]"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

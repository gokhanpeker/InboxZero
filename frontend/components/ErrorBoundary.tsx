"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("UI render error", error, errorInfo);
    }
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-900">Something went wrong</h2>
          <p className="mt-2 text-sm text-red-800">
            The page failed to render. Please reload and try again.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-4 rounded-lg bg-red-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

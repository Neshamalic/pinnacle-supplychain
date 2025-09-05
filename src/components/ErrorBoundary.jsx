// src/components/ErrorBoundary.jsx
import React from "react";
import Icon from "./AppIcon";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log útil en consola y opcionalmente a tu servicio
    console.error("ErrorBoundary:", error, errorInfo);
    this.setState({ info: errorInfo });
    // Si usas esa API global, la dejamos por compatibilidad:
    error.__ErrorBoundary = true;
    window.__COMPONENT_ERROR__?.(error, errorInfo);
  }

  render() {
    if (this.state?.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <div className="text-center p-8 max-w-xl">
            <div className="flex justify-center items-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 32 33" fill="none">
                <path d="M16 28.5C22.6274 28.5 28 23.1274 28 16.5C28 9.87258 22.6274 4.5 16 4.5C9.37258 4.5 4 9.87258 4 16.5C4 23.1274 9.37258 28.5 16 28.5Z" stroke="#343330" strokeWidth="2" strokeMiterlimit="10" />
                <path d="M11.5 15.5C12.3284 15.5 13 14.8284 13 14C13 13.1716 12.3284 12.5 11.5 12.5C10.6716 12.5 10 13.1716 10 14C10 14.8284 10.6716 15.5 11.5 15.5Z" fill="#343330" />
                <path d="M20.5 15.5C21.3284 15.5 22 14.8284 22 14C22 13.1716 21.3284 12.5 20.5 12.5C19.6716 12.5 19 13.1716 19 14C19 14.8284 19.6716 15.5 20.5 15.5Z" fill="#343330" />
                <path d="M21 22.5C19.9625 20.7062 18.2213 19.5 16 19.5C13.7787 19.5 12.0375 20.7062 11 22.5" stroke="#343330" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1 className="text-2xl font-medium text-neutral-800 mb-2">Something went wrong</h1>

            {/* 👇 Aquí mostramos el mensaje real del error */}
            {this.state.error && (
              <pre className="text-left bg-white border border-neutral-200 rounded-md p-3 text-sm overflow-auto max-h-60">
                {String(this.state.error?.message || this.state.error)}
              </pre>
            )}

            <div className="flex justify-center items-center gap-3 mt-6">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded flex items-center gap-2 transition-colors duration-200 shadow-sm"
              >
                <Icon name="RefreshCw" size={18} color="#fff" />
                Reload
              </button>
              <button
                onClick={() => { window.location.href = "/"; }}
                className="border border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-medium py-2 px-4 rounded flex items-center gap-2 transition-colors duration-200"
              >
                <Icon name="ArrowLeft" size={18} />
                Back Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props?.children;
  }
}

export default ErrorBoundary;

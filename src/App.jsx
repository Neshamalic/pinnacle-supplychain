// src/App.jsx
import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./Routes";

// Pequeño ErrorBoundary para evitar "pantalla blanca" silenciosa
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // te deja el error en consola para rastrearlo
    console.error("[App ErrorBoundary]", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, color: "#b00" }}>
          <h3>Something went wrong.</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error || "")}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

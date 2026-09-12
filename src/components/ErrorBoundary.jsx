import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("ErrorBoundary ha capturado un error de componente:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-6 bg-surface rounded-xl border border-outline-variant text-center text-sm text-secondary my-4">
          <p className="font-bold text-on-surface mb-1">No se pudo cargar este módulo en este momento.</p>
          <p className="text-xs">Por favor, intenta recargar la página o volver al menú principal.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

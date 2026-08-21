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
    console.warn("Redirigiendo silenciosamente a la portada tras actualización de estado:", error);
    try {
      // Redirección inmediata y limpia a la portada principal sin mostrar tarjetas de error
      window.location.href = '/';
    } catch (e) {
      console.error(e);
    }
  }

  render() {
    if (this.state.hasError) {
      // No mostrar tarjeta flotante, redirección automática
      return null;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

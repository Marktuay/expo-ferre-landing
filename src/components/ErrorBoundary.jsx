import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled UI error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-gray-200 max-w-md w-full">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sesión Actualizada</h2>
            <p className="text-gray-600 text-sm mb-6">
              La sesión ha sido actualizada o el tiempo de conexión expiró. Haz clic abajo para volver al inicio.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-6 bg-[#283474] text-white font-semibold rounded-xl shadow-md hover:bg-[#1e2759] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Volver a la Portada
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

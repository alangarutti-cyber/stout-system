
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Erro capturado:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-xl w-full rounded-lg border bg-white p-6 shadow">
            <h1 className="text-xl font-bold mb-2">Ops, algo quebrou nesta tela.</h1>
            <p className="text-sm text-gray-600 mb-4">
              O aplicativo continua rodando. Verifique o console do navegador para detalhes do erro e
              ajuste o módulo que causou a falha.
            </p>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
              {String(this.state.error)}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

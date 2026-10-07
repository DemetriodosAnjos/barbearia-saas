/**
 * src/components/ui/ErrorBoundary.tsx
 *
 * Componente Centralizado de Error Boundary para React 19 (Front-End Architecture).
 *
 * Padrões e Normas:
 * - React Component Error Containment: Impede que erros pontuais desmontem a árvore inteira de componentes.
 * - Graceful Degradation: Exibe estado visual de fallback seguro com opção de restauração (retry).
 * - Observabilidade: Registra diagnósticos estruturados em tempo de execução sem travar a interface do usuário.
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ComponentCrashFallback } from "./ContractFallback";

export interface ErrorBoundaryProps {
  children: ReactNode;
  componentName?: string;
  fallback?: ReactNode;
  fallbackRender?: (props: { error: Error; resetErrorBoundary: () => void }) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    const compName = this.props.componentName || "Componente";
    console.error(`[ERROR_BOUNDARY_CONTAINMENT] Falha isolada em '${compName}':`, error.message, errorInfo);

    if (typeof this.props.onError === "function") {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerErr) {
        console.warn("[ERROR_BOUNDARY] Erro no callback onError:", handlerErr);
      }
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Se resetKeys foram fornecidos e algum mudou, reseta o estado de erro
    if (this.state.hasError && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys || [];
      const currentKeys = this.props.resetKeys;
      const hasChanged = currentKeys.some((key, idx) => key !== prevKeys[idx]);

      if (hasChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = (): void => {
    if (typeof this.props.onReset === "function") {
      try {
        this.props.onReset();
      } catch (e) {
        console.warn("[ERROR_BOUNDARY] Erro no callback onReset:", e);
      }
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // 1. Renderizador customizado (Function as Child / Render Prop)
      if (typeof this.props.fallbackRender === "function") {
        return this.props.fallbackRender({
          error: this.state.error,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      // 2. Nó JSX customizado
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 3. Fallback padrão seguro de colapso de componente
      return (
        <ComponentCrashFallback
          componentName={this.props.componentName || "Módulo da Tela"}
          error={this.state.error}
          onReset={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component (HOC) para encapsular componentes funcionais ou de classe
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  boundaryProps: Omit<ErrorBoundaryProps, "children"> = {}
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";

  const ComponentWithErrorBoundary: React.FC<P> = (props) => {
    return (
      <ErrorBoundary componentName={displayName} {...boundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;

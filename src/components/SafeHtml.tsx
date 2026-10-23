/**
 * @file SafeHtml.tsx
 * @description Componente React para renderização de HTML higienizado com DOMPurify.
 * Impede execução de scripts (XSS Refletido, Armazenado e Baseado em DOM), eventos
 * inline (onload, onerror) e vetores via pseudo-protocolos javascript:.
 */

import React, { useMemo, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { sanitizeClientHtml, SanitizationPreset, SanitizeReport } from '../security/dompurifyConfig';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Error Boundary específico para contenção de falhas em renderização HTML
 */
class SafeHtmlErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[SafeHtml ErrorBoundary] Falha na renderização de HTML seguro:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Conteúdo bloqueado por violação de segurança do parser.</span>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export interface SafeHtmlProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Conteúdo bruto (raw HTML) potencialmente não confiável (de inputs, APIs externas, CMS, etc.)
   */
  html: string;

  /**
   * Preset de segurança:
   * - 'strict': Apenas tags de texto e formatação inline (b, i, strong, code...)
   * - 'comment': Permite parágrafos, listas e links higienizados com noopener/noreferrer
   * - 'rich': Artigos completos com tabelas, cabeçalhos e mídias seguras
   * @default 'comment'
   */
  preset?: SanitizationPreset;

  /**
   * Elemento raiz HTML que encapsulará o conteúdo
   * @default 'div'
   */
  as?: 'div' | 'span' | 'article' | 'section' | 'p';

  /**
   * Se true, exibe um pequeno badge discreto indicando se o conteúdo foi higienizado com segurança
   * @default false
   */
  showSecurityBadge?: boolean;

  /**
   * Callback opcional acionado quando a higienização é concluída (útil para telemetria de XSS)
   */
  onSanitized?: (report: SanitizeReport) => void;

  /**
   * Conteúdo alternativo exibido caso o HTML original seja totalmente vazio ou inválido
   */
  emptyFallback?: ReactNode;
}

const SafeHtmlInner: React.FC<SafeHtmlProps> = ({
  html,
  preset = 'comment',
  as: ComponentTag = 'div',
  className = '',
  showSecurityBadge = false,
  onSanitized,
  emptyFallback = null,
  children: _unusedChildren,
  ...restProps
}) => {
  // Higienização memoizada e resiliente para alta performance
  const { cleanHtml, report } = useMemo(() => {
    if (!html || typeof html !== 'string') {
      const emptyReport: SanitizeReport = {
        originalLength: 0,
        sanitizedLength: 0,
        removedElementsCount: 0,
        removedAttributesCount: 0,
        hasThreats: false,
        detectedThreats: [],
        executionTimeMs: 0,
      };
      return { cleanHtml: '', report: emptyReport };
    }

    try {
      return sanitizeClientHtml(html, preset);
    } catch {
      return {
        cleanHtml: '',
        report: {
          originalLength: html.length,
          sanitizedLength: 0,
          removedElementsCount: 0,
          removedAttributesCount: 0,
          hasThreats: true,
          detectedThreats: ['Parser Error Intercepted'],
          executionTimeMs: 0,
        }
      };
    }
  }, [html, preset]);

  // Telemetria assíncrona após commit da renderização para evitar re-render em cascata
  useEffect(() => {
    if (onSanitized && report) {
      onSanitized(report);
    }
  }, [report, onSanitized]);

  if (!cleanHtml.trim()) {
    if (emptyFallback) {
      return <>{emptyFallback}</>;
    }
    return null;
  }

  return (
    <div className="relative group inline-block w-full">
      <ComponentTag
        className={`safe-html-container break-words ${className}`}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
        {...restProps}
      />

      {showSecurityBadge && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
          {report.hasThreats ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              {report.detectedThreats.length} vetor(es) malicioso(s) neutralizado(s)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Sanitizado com DOMPurify ({preset}) • {report.executionTimeMs}ms
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Wrapper SafeHtml protegido pelo SafeHtmlErrorBoundary na raiz do componente
 */
export const SafeHtml: React.FC<SafeHtmlProps> = (props) => {
  return (
    <SafeHtmlErrorBoundary fallback={props.emptyFallback}>
      <SafeHtmlInner {...props} />
    </SafeHtmlErrorBoundary>
  );
};

export default SafeHtml;

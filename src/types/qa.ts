export type TeamRole = 'Frontend' | 'Backend' | 'Cyber Security' | 'QA / DevOps' | 'Serviços Externos (Supabase / Mercado Pago)';

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'SECURITY';

export interface ProjectFileScan {
  path: string;
  category: 'Component' | 'Story' | 'Config' | 'Test' | 'CI Pipeline';
  status: 'SYNTAX_OK' | 'TESTS_PASSING' | 'REGRESSION_ALERT' | 'SYNCED';
  linesOfCode: number;
  tokensCount: number;
  lastAudited: string;
  checksum: string;
}

export interface VisualDiffItem {
  id: string;
  component: string;
  story: string;
  state: 'default' | 'hover' | 'active' | 'disabled' | 'error' | 'loading';
  baselineUrl: string;
  candidateUrl: string;
  diffPercentage: number;
  status: 'MATCH' | 'REGRESSION' | 'ACCEPTABLE_DELTA';
  threshold: number;
  viewport: string;
  browser: 'Chromium' | 'WebKit' | 'Firefox';
  hasCascadingImpact: boolean;
  dependentScreens: string[];
}

export interface CorrectionItem {
  id: string;
  title: string;
  team: TeamRole;
  scope: 'Internal (Projeto)' | 'External (Fora do Projeto)';
  severity: 'Alta' | 'Média' | 'Crítica' | 'Informativa';
  status: 'Corrigido no Código' | 'Pendente de Configuração Externa' | 'Monitorando';
  subtitles?: string;
  description: string[];
  externalSteps?: string[];
  targetService?: 'Supabase' | 'Mercado Pago' | 'Chromatic' | 'GitHub Actions' | 'N/A';
}

export interface DocSection {
  id: string;
  title: string;
  subsections: {
    id: string;
    title: string;
    summary: string;
    content: string[];
    codeSnippets?: {
      language: string;
      code: string;
    }[];
  }[];
}

export interface ConsoleLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  team: TeamRole;
  message: string;
  details?: string;
}

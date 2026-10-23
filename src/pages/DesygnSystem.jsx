import React, { useState } from 'react';
import {
  Palette,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  Terminal,
  Activity,
  Search,
  Copy,
  Check,
  Download,
  Trash2,
  Play,
  Pause,
  Clock,
  Layers,
  SlidersHorizontal,
  FolderKanban,
  FileCode2,
  RefreshCw,
  Loader2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Zap,
  Cpu,
  Lock,
  Compass,
  CheckSquare,
  Scissors,
  Calendar,
  Users,
  DollarSign,
  CreditCard,
  Building2,
  Store,
  Package,
  Tag,
  Bell,
  MessageSquare,
  Settings,
  Folder,
  FlaskConical,
  Scroll,
  Crown,
  Hourglass,
  Wrench,
  Lightbulb,
  X,
  Bot,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Circle,
  AppWindow,
  Shield,
  Globe,
  Printer,
  Accessibility,
  Rocket,
  Gift,
  Link,
  Smartphone,
  Edit3,
  Cloud,
  Target,
  FileText,
  BarChart3,
  QrCode,
  Key,
  Save,
  Database,
  Server,
  EyeOff,
  ShieldAlert,
  KeyRound,
  Network
} from 'lucide-react';
import QALoadingSpinner from './QAPanel/QALoadingSpinner.jsx';

/**
 * DesygnSystem Page
 * Catálogo Oficial de Design Tokens, Paleta Âmbar Nobre e Biblioteca de Ícones Lucide-React (^1.48.0)
 * Sem nenhum emoji — todos os elementos utilizam ícones vetoriais que herdam os tokens do projeto.
 */
export default function DesygnSystem() {
  const [copiedToken, setCopiedToken] = useState(null);
  const [iconSearch, setIconSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLiveSpinner, setShowLiveSpinner] = useState(false);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 1800);
  };

  // Paleta Oficial & Tokens de Design - Âmbar Nobre
  const nobleAmberTokens = [
    { name: 'Âmbar 50', hex: '#fffbeb', tailwind: 'bg-amber-50', textCol: 'text-neutral-900', role: 'Destaques sutis / Fundos ultra-claros' },
    { name: 'Âmbar 100', hex: '#fef3c7', tailwind: 'bg-amber-100', textCol: 'text-neutral-900', role: 'Superfícies de badge claras' },
    { name: 'Âmbar 200', hex: '#fde68a', tailwind: 'bg-amber-200', textCol: 'text-neutral-900', role: 'Bordas ativas claras' },
    { name: 'Âmbar 300', hex: '#fcd34d', tailwind: 'bg-amber-300', textCol: 'text-neutral-950', role: 'Texto com alto brilho em dark mode' },
    { name: 'Âmbar 400', hex: '#fbbf24', tailwind: 'bg-amber-400', textCol: 'text-neutral-950', role: 'Ícones em foco & indicadores' },
    { name: 'Âmbar 500 (Principal)', hex: '#f59e0b', tailwind: 'bg-amber-500', textCol: 'text-neutral-950', role: 'Cor primária nobre da marca e botões' },
    { name: 'Âmbar 600', hex: '#d97706', tailwind: 'bg-amber-600', textCol: 'text-neutral-50', role: 'Bordas acentuadas e estados hover' },
    { name: 'Âmbar 700', hex: '#b45309', tailwind: 'bg-amber-700', textCol: 'text-neutral-50', role: 'Contornos escuros e sombras ricas' },
    { name: 'Âmbar 800', hex: '#92400e', tailwind: 'bg-amber-800', textCol: 'text-neutral-100', role: 'Fundos de elementos densos' },
    { name: 'Âmbar 900', hex: '#78350f', tailwind: 'bg-amber-900', textCol: 'text-neutral-100', role: 'Bases de painéis temáticos' },
    { name: 'Âmbar 950', hex: '#451a03', tailwind: 'bg-amber-950', textCol: 'text-neutral-200', role: 'Plano de fundo nobre profundo' },
  ];

  // Catálogo completo de ícones lucide-react classificados
  const iconCatalog = [
    // QA & Automação
    { name: 'ShieldCheck', icon: ShieldCheck, category: 'qa', description: 'Garantia de Qualidade e Conformidade' },
    { name: 'Terminal', icon: Terminal, category: 'qa', description: 'Console de Comandos e Logs de Execução' },
    { name: 'Activity', icon: Activity, category: 'qa', description: 'Monitoramento em tempo real de suítes' },
    { name: 'Bug', icon: Bug, category: 'qa', description: 'Rastreamento e auditoria de anomalias' },
    { name: 'FileCode2', icon: FileCode2, category: 'qa', description: 'Arquivos de especificação de teste' },
    { name: 'FlaskConical', icon: FlaskConical, category: 'qa', description: 'Bancada de testes e laboratório QA' },
    { name: 'Folder', icon: Folder, category: 'qa', description: 'Varredura e indexação de diretórios' },
    { name: 'Scroll', icon: Scroll, category: 'qa', description: 'Console de logs e trilhas de auditoria' },
    { name: 'Crown', icon: Crown, category: 'qa', description: 'Acesso privilegiado e SuperAdmin' },
    { name: 'Hourglass', icon: Hourglass, category: 'qa', description: 'Tempo decorrido e testes em progresso' },
    { name: 'Wrench', icon: Wrench, category: 'qa', description: 'Playbooks de remediação e correção' },
    { name: 'Bot', icon: Bot, category: 'qa', description: 'Automação inteligente e análise preditiva' },
    { name: 'RotateCcw', icon: RotateCcw, category: 'qa', description: 'Restauração de fixtures e reset de estado' },
    { name: 'Zap', icon: Zap, category: 'qa', description: 'Testes de estresse e performance' },
    { name: 'Lock', icon: Lock, category: 'qa', description: 'Validação de autenticação e RBAC' },
    { name: 'Shield', icon: Shield, category: 'qa', description: 'Proteção perimetral e firewall' },

    // Status & Alertas
    { name: 'CheckCircle2', icon: CheckCircle2, category: 'status', description: 'Testes aprovados e integridade' },
    { name: 'AlertTriangle', icon: AlertTriangle, category: 'status', description: 'Avisos de regressão e timeouts' },
    { name: 'AlertCircle', icon: AlertCircle, category: 'status', description: 'Erros críticos de asserção' },
    { name: 'Info', icon: Info, category: 'status', description: 'Informativos do motor de teste' },
    { name: 'RefreshCw', icon: RefreshCw, category: 'status', description: 'Recarregar dados e sincronizar' },
    { name: 'Loader2', icon: Loader2, category: 'status', description: 'Spinner animado de execução' },
    { name: 'Clock', icon: Clock, category: 'status', description: 'Duração e latência de benchmarks' },
    { name: 'Check', icon: Check, category: 'status', description: 'Asserção aprovada com sucesso' },
    { name: 'X', icon: X, category: 'status', description: 'Falha de asserção / Fechar' },
    { name: 'Circle', icon: Circle, category: 'status', description: 'Pendente / Não iniciado' },

    // Controles & Ações
    { name: 'SlidersHorizontal', icon: SlidersHorizontal, category: 'controls', description: 'Filtros e parametrização' },
    { name: 'Search', icon: Search, category: 'controls', description: 'Busca semântica em registros' },
    { name: 'Copy', icon: Copy, category: 'controls', description: 'Cópia de payloads e logs' },
    { name: 'Download', icon: Download, category: 'controls', description: 'Exportação de relatórios QA' },
    { name: 'Trash2', icon: Trash2, category: 'controls', description: 'Limpeza de buffer do terminal' },
    { name: 'Play', icon: Play, category: 'controls', description: 'Execução de suítes de teste' },
    { name: 'Pause', icon: Pause, category: 'controls', description: 'Pausa no fluxo de streaming' },
    { name: 'Settings', icon: Settings, category: 'controls', description: 'Configurações de infraestrutura' },
    { name: 'ArrowRight', icon: ArrowRight, category: 'controls', description: 'Próxima etapa / Avançar' },
    { name: 'ArrowLeft', icon: ArrowLeft, category: 'controls', description: 'Etapa anterior / Voltar' },
    { name: 'ChevronDown', icon: ChevronDown, category: 'controls', description: 'Expandir menu dropdown' },
    { name: 'ChevronUp', icon: ChevronUp, category: 'controls', description: 'Recolher menu dropdown' },
    { name: 'ExternalLink', icon: ExternalLink, category: 'controls', description: 'Link externo ou documentação' },

    // Design & Tokens
    { name: 'Sparkles', icon: Sparkles, category: 'design', description: 'Tokens e decorações Âmbar Nobre' },
    { name: 'Palette', icon: Palette, category: 'design', description: 'Guia de estilos e design system' },
    { name: 'Layers', icon: Layers, category: 'design', description: 'Camadas de abstração visual' },
    { name: 'AppWindow', icon: AppWindow, category: 'design', description: 'Sandbox e componentes modulares' },
    { name: 'Eye', icon: Eye, category: 'design', description: 'Inspeção visual e contraste' },
    { name: 'Lightbulb', icon: Lightbulb, category: 'design', description: 'Recomendações e boas práticas' },

    { name: "Globe", icon: Globe, category: "controls", description: "Conexões de rede e restrição egress" },
    { name: "Printer", icon: Printer, category: "controls", description: "Impressão e exportação PDF formal" },
    { name: "Accessibility", icon: Accessibility, category: "design", description: "Conformidade WCAG 2.2 AA e acessibilidade" },
    { name: "Rocket", icon: Rocket, category: "business", description: "Impersonate e lançamentos rápidos" },
    { name: "Gift", icon: Gift, category: "business", description: "Bônus de dias de trial e concessões" },
    { name: "Link", icon: Link, category: "controls", description: "Links de pagamento Nubank PJ e integrações" },
    { name: "Smartphone", icon: Smartphone, category: "business", description: "Disparo WhatsApp e canais móveis" },
    { name: "Edit3", icon: Edit3, category: "controls", description: "Edição de planos, benefícios e valores" },
    { name: "Cloud", icon: Cloud, category: "qa", description: "Bloqueio IMDS de metadados em nuvem" },
    { name: "Target", icon: Target, category: "qa", description: "Simuladores de estresse e precisão" },
    { name: "FileText", icon: FileText, category: "controls", description: "Laudos técnicos e relatórios formais" },
    { name: "BarChart3", icon: BarChart3, category: "qa", description: "Gráficos de métricas, carga e telemetria" },
    // Barbearia & Negócio
    { name: 'Scissors', icon: Scissors, category: 'business', description: 'Cortes de cabelo e serviços' },
    { name: 'Calendar', icon: Calendar, category: 'business', description: 'Agenda de atendimentos e horários' },
    { name: 'Users', icon: Users, category: 'business', description: 'Gestão de clientes e barbeiros' },
    { name: 'DollarSign', icon: DollarSign, category: 'business', description: 'Faturamento, repasses e comissões' },
    { name: 'CreditCard', icon: CreditCard, category: 'business', description: 'Pagamentos online e conciliação' },
    { name: 'Building2', icon: Building2, category: 'business', description: 'Unidades e isolamento multi-tenant' },
    { name: 'Store', icon: Store, category: 'business', description: 'Visão geral da barbearia' },
    { name: 'Package', icon: Package, category: 'business', description: 'Produtos e controle de estoque' },
    { name: 'Tag', icon: Tag, category: 'business', description: 'Categorias e serviços promocionais' },
    { name: 'Bell', icon: Bell, category: 'business', description: 'Alertas e lembretes de agendamento' },

    // Mercado Pago API & Gateway
    { name: 'CreditCard', icon: CreditCard, category: 'mercadopago', description: 'Checkout Pro e cartões de crédito/débito' },
    { name: 'QrCode', icon: QrCode, category: 'mercadopago', description: 'Cobrança Pix Instantâneo e QR Code' },
    { name: 'Activity', icon: Activity, category: 'mercadopago', description: 'Ping Conexão e Health Check oficial (200 OK)' },
    { name: 'Key', icon: Key, category: 'mercadopago', description: 'Chave Pública (Public Key) e Credenciais' },
    { name: 'Lock', icon: Lock, category: 'mercadopago', description: 'Token de Acesso (Access Token privado)' },
    { name: 'ShieldCheck', icon: ShieldCheck, category: 'mercadopago', description: 'Segredo HMAC e validação x-signature de Webhook' },
    { name: 'Terminal', icon: Terminal, category: 'mercadopago', description: 'Console de telemetria e logs HTTP em tempo real' },
    { name: 'Globe', icon: Globe, category: 'mercadopago', description: 'URL de Webhook oficial para notificações' },
    { name: 'Zap', icon: Zap, category: 'mercadopago', description: 'Disparo de emissão instantânea via Gateway' },
    { name: 'CheckCircle2', icon: CheckCircle2, category: 'mercadopago', description: 'Retorno 200 OK e pagamento aprovado' },
    { name: 'AlertTriangle', icon: AlertTriangle, category: 'mercadopago', description: 'Retorno 400 Bad Request e validação de chaves' },
    { name: 'FlaskConical', icon: FlaskConical, category: 'mercadopago', description: 'Modo Teste / Sandbox (transações fictícias)' },
    { name: 'Rocket', icon: Rocket, category: 'mercadopago', description: 'Modo Produção / Live (cobranças reais)' },
    { name: 'RotateCcw', icon: RotateCcw, category: 'mercadopago', description: 'Reset do Console de Logs e Restaurar Segredo' },
    { name: 'Save', icon: Save, category: 'mercadopago', description: 'Salvar e persistir credenciais ativas' },

    // Chaves de API, Infraestrutura & SSOT (.env.example)
    { name: 'Database', icon: Database, category: 'apikeys', description: 'Supabase PostgreSQL & Repositório Central SSOT' },
    { name: 'Server', icon: Server, category: 'apikeys', description: 'Servidor Backend, Edge Functions & Proxies' },
    { name: 'Key', icon: Key, category: 'apikeys', description: 'Chaves Públicas e Privadas (.env.example)' },
    { name: 'KeyRound', icon: KeyRound, category: 'apikeys', description: 'Rotação de credenciais e tokens de acesso' },
    { name: 'Lock', icon: Lock, category: 'apikeys', description: 'Segredos HMAC, Senhas e Variáveis Estritas' },
    { name: 'EyeOff', icon: EyeOff, category: 'apikeys', description: 'Mascaramento seguro de chaves sensíveis' },
    { name: 'ShieldAlert', icon: ShieldAlert, category: 'apikeys', description: 'Prevenção de vazamento de credenciais no cliente' },
    { name: 'Network', icon: Network, category: 'apikeys', description: 'Restrição de egresso de rede e allowlist' },
    { name: 'Cpu', icon: Cpu, category: 'apikeys', description: 'Google Gemini API e Processamento Server-Side' },
    { name: 'RefreshCw', icon: RefreshCw, category: 'apikeys', description: 'Sincronização em cascata com o arquivo .env' },
  ];

  const categories = [
    { id: 'all', label: 'Todos os Ícones' },
    { id: 'apikeys', label: 'Chaves de API & SSOT (.env)' },
    { id: 'mercadopago', label: 'Mercado Pago API & Gateway' },
    { id: 'qa', label: 'QA & Automação' },
    { id: 'status', label: 'Status & Alertas' },
    { id: 'controls', label: 'Controles & Ações' },
    { id: 'design', label: 'Design & Tokens' },
    { id: 'business', label: 'Barbearia & Negócio' },
  ];

  const filteredIcons = iconCatalog.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(iconSearch.toLowerCase()) ||
                          item.description.toLowerCase().includes(iconSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-10 pb-16">
      {/* Header do Design System */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-amber-500/20 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Paleta Oficial & Tokens de Design: Âmbar Nobre
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-100 tracking-tight">
              DesygnSystem & Biblioteca de Ícones
            </h1>
            <p className="mt-2 text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Todos os emojis foram completamente substituídos pelos ícones vetoriais da biblioteca instalada{' '}
              <code className="text-amber-300 font-mono text-xs bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                lucide-react (^1.48.0)
              </code>
              , herdando a paleta de cores institucional Âmbar Nobre e conformidade visual em alto padrão.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-4 rounded-xl bg-neutral-900 border border-amber-500/30 flex items-center gap-3 shadow-lg shadow-amber-950/40">
              <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-neutral-950 font-bold">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Status de Migração</p>
                <p className="text-sm font-semibold text-amber-300">100% Lucide Icons</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 1: Paleta de Cores Oficial & Tokens de Design - Âmbar Nobre */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Palette className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-neutral-100">Tokens da Paleta Âmbar Nobre</h2>
          </div>
          <span className="text-xs text-neutral-500 font-mono">Clique para copiar o valor HEX</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {nobleAmberTokens.map((token, idx) => {
            const isCopied = copiedToken === `token-${idx}`;
            return (
              <div
                key={token.name}
                onClick={() => copyToClipboard(token.hex, `token-${idx}`)}
                className="group p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-amber-500/40 hover:bg-neutral-900 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className={`w-full h-14 rounded-lg ${token.tailwind} shadow-inner flex items-center justify-center font-mono text-xs font-bold transition-transform group-hover:scale-98`}>
                    <span className={token.textCol}>{token.hex}</span>
                  </div>
                  <h4 className="mt-2.5 text-xs font-semibold text-neutral-200">{token.name}</h4>
                  <p className="text-[10px] text-neutral-400 leading-tight mt-1 line-clamp-2">{token.role}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-500">
                  <span className="font-mono">{token.hex}</span>
                  {isCopied ? (
                    <span className="text-amber-400 flex items-center gap-0.5 font-medium">
                      <Check className="w-3 h-3" /> Copiado
                    </span>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 text-amber-400 transition-opacity">
                      Copiar
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Seção 2: Demonstração dos Ícones Lucide com Herança Âmbar Nobre */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100">Catálogo de Ícones do Sistema</h2>
              <p className="text-xs text-neutral-400">Herdando cores, traços e estados da paleta Âmbar Nobre</p>
            </div>
          </div>

          {/* Busca de Ícones */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
            <input
              type="text"
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              placeholder="Buscar ícone no Design System..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
            />
          </div>
        </div>

        {/* Abas de Categorias */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grade de Ícones com Herança de Paleta */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredIcons.map((item) => {
            const IconComponent = item.icon;
            const isCopied = copiedToken === item.name;

            return (
              <div
                key={item.name}
                onClick={() => copyToClipboard(`<${item.name} className="text-amber-500" />`, item.name)}
                className="group relative p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-amber-500/40 hover:bg-neutral-900 transition-all cursor-pointer flex flex-col items-center text-center justify-between"
              >
                {/* Glow decorativo no hover */}
                <div className="absolute inset-0 rounded-xl bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/* Ícone com variações da Paleta Âmbar Nobre */}
                <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-amber-500/20 flex items-center justify-center my-2 text-amber-500 group-hover:text-amber-400 group-hover:border-amber-500/50 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all">
                  <IconComponent className="w-6 h-6 stroke-[2]" />
                </div>

                <div className="w-full">
                  <p className="text-xs font-mono font-semibold text-neutral-200 group-hover:text-amber-300 transition-colors truncate">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">
                    {item.description}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-neutral-800/80 w-full flex items-center justify-center text-[10px] text-neutral-500">
                  {isCopied ? (
                    <span className="text-amber-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> JSX Copiado
                    </span>
                  ) : (
                    <span className="text-neutral-500 group-hover:text-amber-400 transition-colors flex items-center gap-1">
                      <Copy className="w-2.5 h-2.5" /> Copiar JSX
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Seção 3: Demonstração ao Vivo dos Componentes de QA (Spinner & Controles) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-100">Componentes Integrados & Tokens em Ação</h2>
            <p className="text-xs text-neutral-400">Amostragem dos componentes atualizados com a biblioteca lucide-react</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: QALoadingSpinner com Âmbar Nobre */}
          <div className="p-6 rounded-xl bg-neutral-900/70 border border-neutral-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  QALoadingSpinner (Integração Oficial)
                </span>
                <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  lucide-react
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                O componente de carregamento do QA Studio utiliza ícones vetoriais para representar cada uma das 5 fases de inicialização, com anéis concêntricos estilizados na paleta Âmbar Nobre e animações SVG suaves.
              </p>
              
              <button
                onClick={() => setShowLiveSpinner(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/20"
              >
                <Play className="w-3.5 h-3.5" />
                Disparar Demonstração do QALoadingSpinner
              </button>
            </div>
            
            <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
              <span>Tokens: Âmbar Nobre (400, 500, 600)</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 100% Vetorial
              </span>
            </div>
          </div>

          {/* Card 2: Variações de Estado e Botões de Ação */}
          <div className="p-6 rounded-xl bg-neutral-900/70 border border-neutral-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  Botões de Ação & Badges com Tokens
                </span>
                <span className="text-[11px] font-mono text-neutral-400">Âmbar Nobre UI</span>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors shadow-md shadow-amber-500/20">
                    <Play className="w-3.5 h-3.5" />
                    Iniciar Suíte
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs transition-colors">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    Sincronizar
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs border border-neutral-700 transition-colors">
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    Exportar
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs space-y-2">
                  <p className="font-semibold text-neutral-300">Badges Semânticos:</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      <Sparkles className="w-3 h-3 text-amber-400" /> Âmbar Nobre Oficial
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> QA Passed
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-rose-500/10 text-rose-300 border border-rose-500/30">
                      <AlertCircle className="w-3 h-3 text-rose-400" /> Regression Found
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/90 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Todos os componentes e ícones herdam <code>currentColor</code> e tokens nobres.</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
              <span>Biblioteca: lucide-react (^1.48.0)</span>
              <span className="text-amber-400 font-mono">Tokens Ativos</span>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Interativo do QALoadingSpinner ao Vivo */}
      {showLiveSpinner && (
        <QALoadingSpinner
          title="Executando Validações de QA Studio"
          onComplete={() => setShowLiveSpinner(false)}
          onCancel={() => setShowLiveSpinner(false)}
          phaseDurationMs={600}
        />
      )}
    </div>
  );
}

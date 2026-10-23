/**
 * @file DashboardPrototype.tsx
 * @description Protótipo de Dashboard Operacional com métricas em tempo real e tabelas protegidas com SafeHtml.
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShieldCheck, 
  ArrowUpRight, 
  RefreshCw, 
  Filter, 
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { SafeHtml } from '../SafeHtml';

interface TransactionItem {
  id: string;
  customerName: string;
  customerBioOrNote: string;
  amount: string;
  status: 'PAID' | 'PENDING' | 'REJECTED';
  date: string;
}

const SAMPLE_TRANSACTIONS: TransactionItem[] = [
  {
    id: 'TX-8921',
    customerName: 'Mariana Silva',
    customerBioOrNote: 'Cliente VIP • Assinatura anual com <em>desconto de fidelidade</em>.',
    amount: 'R$ 1.490,00',
    status: 'PAID',
    date: 'Hoje, 13:42'
  },
  {
    id: 'TX-8920',
    customerName: 'Carlos Eduardo',
    customerBioOrNote: 'Aviso: <script>alert("xss")</script>Solicitação de nota fiscal com CNPJ corporativo.',
    amount: 'R$ 820,50',
    status: 'PAID',
    date: 'Hoje, 12:15'
  },
  {
    id: 'TX-8919',
    customerName: 'Renata Albuquerque',
    customerBioOrNote: 'Pedido de upgrade com link de suporte <a href="https://example.com/ajuda">Central</a>.',
    amount: 'R$ 3.250,00',
    status: 'PENDING',
    date: 'Hoje, 10:04'
  },
  {
    id: 'TX-8918',
    customerName: 'Lucas Ferreira',
    customerBioOrNote: 'Tentativa de injeção contida: <img src="x" onerror="evil()" /> Contato inicial.',
    amount: 'R$ 450,00',
    status: 'REJECTED',
    date: 'Ontem, 18:30'
  }
];

export const DashboardPrototype: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionItem[]>(SAMPLE_TRANSACTIONS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
        <div>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">
            Painel de Operações & Gestão
          </span>
          <h2 className="text-xl font-bold text-white mt-1">Dashboard Executivo</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitoramento financeiro, clientes e integridade de dados higienizados pelo SafeHtml.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Atualizar</span>
          </button>
          <button className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer">
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Receita Mensal</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">R$ 148.920,00</div>
          <div className="text-xs text-emerald-400 font-mono mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+18.4% vs mês anterior</span>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Clientes Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">1.842</div>
          <div className="text-xs text-indigo-400 font-mono mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+124 novos nesta semana</span>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Taxa de Conversão</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">4.82%</div>
          <div className="text-xs text-zinc-400 font-mono mt-1">
            Média estável de checkout
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Proteção XSS / HMAC</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">100%</div>
          <div className="text-xs text-zinc-400 font-mono mt-1">
            0 vazamentos em inputs
          </div>
        </div>
      </div>

      {/* Transactions Table with SafeHtml Content */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Transações Recentes & Notas Sanitizadas
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Campos de texto de usuários contêm formatações e vetores neutralizados pelo &lt;SafeHtml&gt;
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700">
            {transactions.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">ID Transação</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Nota / Biografia (SafeHtml)</th>
                <th className="py-3 px-4">Valor</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-indigo-300">{tx.id}</td>
                  <td className="py-3.5 px-4 font-semibold text-white">{tx.customerName}</td>
                  <td className="py-3.5 px-4 max-w-xs font-sans text-xs">
                    {/* Renderização 100% segura contra scripts maliciosos embutidos na nota */}
                    <SafeHtml html={tx.customerBioOrNote} preset="comment" showSecurityBadge={false} />
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">{tx.amount}</td>
                  <td className="py-3.5 px-4">
                    {tx.status === 'PAID' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> Pago
                      </span>
                    )}
                    {tx.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                        <Clock className="w-3 h-3" /> Pendente
                      </span>
                    )}
                    {tx.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px]">
                        <AlertTriangle className="w-3 h-3" /> Rejeitado
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 text-[11px]">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

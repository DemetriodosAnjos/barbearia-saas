/**
 * @file LoginPrototype.tsx
 * @description Protótipo de Tela de Login e Autenticação com integração à camada de segurança.
 */

import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Fingerprint
} from 'lucide-react';
import { SafeHtml } from '../SafeHtml';

interface LoginPrototypeProps {
  onSuccess?: () => void;
}

export const LoginPrototype: React.FC<LoginPrototypeProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('admin@empresa.com.br');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [feedbackNotice, setFeedbackNotice] = useState<string>(
    'Bem-vindo de volta! Ambiente protegido com <strong>HMAC SHA-256</strong> e <em>Zero-XSS</em>.'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginStatus('idle');

    setTimeout(() => {
      setIsLoading(false);
      setLoginStatus('success');
      setFeedbackNotice('Autenticação realizada com sucesso. Redirecionando com sessão segura...');
      if (onSuccess) {
        setTimeout(onSuccess, 1000);
      }
    }, 800);
  };

  return (
    <div className="max-w-md mx-auto w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20 mb-3">
          <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
            <Fingerprint className="w-6 h-6 text-indigo-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Barbearia SaaS</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Informe suas credenciais para gerenciar a plataforma
        </p>
      </div>

      {/* Dynamic Security Notice Sanitized by SafeHtml */}
      <div className="mb-6 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-300">
        <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] mb-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Aviso Sanitizado em Tempo Real:</span>
        </div>
        <SafeHtml html={feedbackNotice} preset="comment" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
            E-mail Corporativo
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.nome@empresa.com"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-zinc-300 font-mono">
              Senha de Acesso
            </label>
            <a href="#recuperar" onClick={(e) => e.preventDefault()} className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
              Esqueceu a senha?
            </a>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-indigo-500/20"
            />
            <span className="text-xs text-zinc-400">Lembrar este dispositivo</span>
          </label>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <Lock className="w-3 h-3" /> TLS 1.3
          </span>
        </div>

        {loginStatus === 'success' && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Sessão validada com sucesso!</span>
          </div>
        )}

        {loginStatus === 'error' && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Credenciais incorretas ou chave expirada.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold font-mono flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <span className="animate-pulse">Validando credenciais...</span>
          ) : (
            <>
              <span>Entrar no Painel</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Security Footer */}
      <div className="mt-6 pt-5 border-t border-zinc-800/60 text-center">
        <p className="text-[11px] text-zinc-500 font-mono flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Proteção por Tokens CSRF e Rate Limiting Ativo
        </p>
      </div>
    </div>
  );
};

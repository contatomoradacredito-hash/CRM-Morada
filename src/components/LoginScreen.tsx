import React, { useState, useEffect } from 'react';
import {
  Mail,
  ArrowRight,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { useAuth, PRIMARY_ADMIN_EMAIL } from '../context/AuthContext';
import { MoradaLogo } from './MoradaLogo';

export const LoginScreen: React.FC = () => {
  const { login, loginWithGoogle, loginWithGoogleRedirect } = useAuth();

  const [email, setEmail] = useState<string>(PRIMARY_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<{ title: string; message: string; code?: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Check if the application is currently running inside an iframe (like AI Studio preview)
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';

  const copyDomain = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentDomain);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const openInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Erro na autenticação Google:', err);
      const code = err.code || '';
      const rawMsg = err.message || '';

      if (code === 'auth/unauthorized-domain') {
        setError({
          title: 'Domínio não autorizado no Firebase',
          message: `O domínio atual (${currentDomain}) precisa ser adicionado aos "Domínios autorizados" nas configurações de Autenticação do seu Firebase Console.`,
          code,
        });
      } else if (code === 'auth/popup-blocked') {
        setError({
          title: 'Pop-up bloqueado pelo navegador',
          message:
            'O navegador impediu a abertura da janela do Google. Clique em "Abrir CRM em Nova Aba" ou autorize pop-ups na barra de endereços.',
          code,
        });
      } else if (code === 'auth/popup-closed-by-user') {
        setError({
          title: 'Janela do Google fechada ou interrompida',
          message:
            'A janela foi fechada antes de concluir o login. Em ambientes de pré-visualização (iframe), o navegador pode fechar janelas por segurança. Recomendamos clicar em "Abrir CRM em Nova Aba".',
          code,
        });
      } else if (code === 'auth/operation-not-allowed') {
        setError({
          title: 'Provedor Google desativado no Firebase',
          message:
            'O provedor Google precisa estar ativado no Firebase Console em Authentication > Sign-in method.',
          code,
        });
      } else if (rawMsg.includes('não é o Administrador autorizado')) {
        setError({
          title: 'Conta não autorizada',
          message: rawMsg,
          code: 'UNAUTHORIZED_ACCOUNT',
        });
      } else {
        setError({
          title: 'Não foi possível concluir o login com Google',
          message:
            rawMsg ||
            'Ocorreu uma falha na comunicação com o Google. Tente abrir em uma nova aba ou via redirecionamento.',
          code,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRedirect = async () => {
    setError(null);
    setIsRedirecting(true);
    try {
      await loginWithGoogleRedirect();
    } catch (err: any) {
      console.error('Erro ao redirecionar para o Google:', err);
      setError({
        title: 'Falha no redirecionamento',
        message: err.message || 'Não foi possível iniciar o redirecionamento para o Google.',
        code: err.code,
      });
      setIsRedirecting(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError({
        title: 'Senha necessária',
        message: 'Digite sua senha de administrador para continuar.',
      });
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      console.error('Erro no login com senha:', err);
      const code = err.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError({
          title: 'Credencial inválida',
          message: 'Senha incorreta para a conta de administrador.',
          code,
        });
      } else if (code === 'auth/user-not-found') {
        setError({
          title: 'Usuário não encontrado com senha',
          message:
            'Esta conta ainda não possui senha cadastrada. Utilize o botão principal "Acessar o CRM com Google".',
          code,
        });
      } else {
        setError({
          title: 'Erro de autenticação',
          message: err.message || 'Falha ao realizar login.',
          code,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Highlights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2.5 mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-xl shadow-emerald-950/40 p-2.5 mx-auto mb-1 border border-slate-700/50">
            <MoradaLogo className="w-full h-full" color="#277D53" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Morada Crédito Imobiliário
          </h1>
          <p className="text-xs font-medium text-slate-400">
            Sistema de Gestão de Processos e Financiamentos
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/95 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800 space-y-5">
          {/* Iframe Hint: Open in new tab for flawless Google OAuth */}
          {isInIframe && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Visualização em prévia detectada</span>
              </div>
              <button
                type="button"
                onClick={openInNewTab}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow transition cursor-pointer shrink-0"
                title="Abrir o CRM em uma nova janela sem restrições de iframe"
              >
                <span>Nova Aba</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Diagnostic Error Box */}
          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-rose-200 text-xs space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="font-bold text-rose-300">{error.title}</div>
              </div>
              <p className="text-rose-200/90 leading-relaxed pl-6">{error.message}</p>

              {/* Special action for auth/unauthorized-domain */}
              {error.code === 'auth/unauthorized-domain' && currentDomain && (
                <div className="mt-3 pt-3 border-t border-rose-500/20 pl-6 space-y-2">
                  <div className="text-[11px] font-semibold text-rose-300">
                    Domínio para autorizar no Firebase:
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200">
                    <span className="truncate flex-1">{currentDomain}</span>
                    <button
                      type="button"
                      onClick={copyDomain}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-sans cursor-pointer transition shrink-0"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-300" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href="https://console.firebase.google.com/project/concrete-apogee-tf6jr/authentication/settings"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                    >
                      <span>Abrir Firebase Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Action for popup issues */}
              {(error.code === 'auth/popup-blocked' ||
                error.code === 'auth/popup-closed-by-user' ||
                error.code === 'auth/unauthorized-domain') && (
                <div className="pt-2 pl-6 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openInNewTab}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-medium transition cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3 text-emerald-400" />
                    <span>Abrir em Nova Aba</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleRedirect}
                    disabled={isRedirecting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-medium transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 text-emerald-400 ${isRedirecting ? 'animate-spin' : ''}`} />
                    <span>Tentar Redirecionamento</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5" htmlFor="admin-email">
                E-mail do Administrador (acesso via Google / Gmail)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deiglisonlima@gmail.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            {/* Main Google Access Button */}
            {!showPasswordField && (
              <div className="space-y-2 pt-1">
                <button
                  id="btn-admin-google-auth"
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading || isRedirecting}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Acessar o CRM com Google</span>
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2 px-1 text-[11px] text-slate-400">
                  <button
                    type="button"
                    onClick={openInNewTab}
                    className="inline-flex items-center gap-1 hover:text-emerald-400 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Abrir CRM em Nova Aba</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasswordField(true)}
                    className="hover:text-emerald-400 transition cursor-pointer"
                  >
                    Acessar com Senha
                  </button>
                </div>
              </div>
            )}

            {/* Alternative Password Login Field */}
            {showPasswordField && (
              <form onSubmit={handlePasswordLogin} className="space-y-3 pt-1 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5" htmlFor="admin-password">
                    Senha de Administrador
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoFocus
                      className="block w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-admin-password-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Acessar com Senha</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPasswordField(false)}
                    className="text-[11px] text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                  >
                    Voltar para acesso direto com Google
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

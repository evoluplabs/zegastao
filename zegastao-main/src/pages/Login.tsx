import { useState, type FormEvent, useEffect } from 'react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '@/firebase';
import { authActions } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, CheckCircle2, XCircle, Sword } from 'lucide-react';

const recordReferralFn = httpsCallable<{ referralCode: string }, { ok: boolean }>(
  functions, 'recordReferral'
);

async function maybeRecordReferral() {
  const pending = sessionStorage.getItem('pendingRef');
  if (!pending) return;
  sessionStorage.removeItem('pendingRef');
  try {
    await recordReferralFn({ referralCode: pending });
  } catch { /* silently ignore */ }
}

const ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/weak-password': 'A senha precisa ter ao menos 8 caracteres.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente em alguns minutos.',
  'auth/user-not-found': 'Nenhuma conta encontrada com este e-mail.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
};

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (pwd.length === 0) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score: 1, label: 'Muito fraca', color: 'bg-red-500' };
  if (score === 2) return { score: 2, label: 'Fraca', color: 'bg-amber-500' };
  if (score === 3) return { score: 3, label: 'Razoável', color: 'bg-yellow-400' };
  if (score === 4) return { score: 4, label: 'Boa', color: 'bg-sky-500' };
  return { score: 5, label: 'Forte', color: 'bg-green-500' };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;

  const requirements = [
    { met: password.length >= 8, text: 'Mínimo 8 caracteres' },
    { met: /[A-Z]/.test(password), text: 'Uma letra maiúscula' },
    { met: /[0-9]/.test(password), text: 'Um número' },
  ];

  return (
    <div className="space-y-2 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? color : 'bg-secondary/80'}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground/70">{label}</p>
      <div className="space-y-1">
        {requirements.map((r) => (
          <div key={r.text} className="flex items-center gap-1.5">
            {r.met ? (
              <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
            <span className={`text-xs ${r.met ? 'text-green-400' : 'text-muted-foreground/70'}`}>{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type Mode = 'login' | 'register' | 'reset';

export function Login() {
  const { user, authLoading } = useStore();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) sessionStorage.setItem('pendingRef', ref);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authLoading && user) return <Navigate to="/dashboard" replace />;

  const passwordStrength = getPasswordStrength(password);
  const isPasswordWeak = mode === 'register' && password.length > 0 && passwordStrength.score < 3;
  const passwordMismatch = mode === 'register' && confirmPassword.length > 0 && password !== confirmPassword;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'reset') {
      setBusy(true);
      try {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Link enviado para ' + email + '. Verifique sua caixa de entrada.');
      } catch (err) {
        const code = err instanceof FirebaseError ? err.code : '';
        setError(ERRORS[code] || 'Não foi possível enviar o e-mail. Tente novamente.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'register') {
      if (isPasswordWeak) { setError('Escolha uma senha mais forte.'); return; }
      if (passwordMismatch) { setError('As senhas não coincidem.'); return; }
      if (passwordStrength.score < 2) { setError('A senha precisa ter ao menos 8 caracteres.'); return; }
    }

    setBusy(true);
    try {
      if (mode === 'login') await authActions.loginEmail(email, password);
      else await authActions.registerEmail(email, password);
      await maybeRecordReferral();
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : '';
      setError(ERRORS[code] || 'Algo deu errado. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError('');
    try {
      await authActions.loginGoogle();
      await maybeRecordReferral();
    } catch {
      setError('Não foi possível entrar com o Google.');
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  }

  const TITLES: Record<Mode, string> = {
    login: 'Bem-vindo de volta, aventureiro!',
    register: 'Criar seu Personagem',
    reset: 'Recuperar acesso',
  };
  const SUBTITLES: Record<Mode, string> = {
    login: 'Entre no Realm e continue sua aventura.',
    register: 'Comece a derrotar seus bosses hoje. É grátis.',
    reset: 'Enviaremos um link para redefinir sua senha.',
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
      {/* Ambient grid */}
      <div className="fixed inset-0 opacity-15 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #10b98115 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="fixed top-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <Link to="/" className="relative mb-8 flex items-center gap-2 group">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20 border border-green-500/30 group-hover:bg-green-500/30 transition-colors">
          <Sword className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <p className="font-extrabold text-lg leading-none text-foreground">
            Zé <span className="text-green-400">Gastão</span>
          </p>
          <p className="text-[10px] text-muted-foreground/70">Idle MMO de Finanças</p>
        </div>
      </Link>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{TITLES[mode]}</h1>
          <p className="text-sm text-muted-foreground/70 mt-1">{SUBTITLES[mode]}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/40 p-6 space-y-4">
          {/* Mode tabs */}
          {mode !== 'reset' && (
            <div className="flex rounded-xl border border-border bg-card p-0.5 mb-2">
              <button
                onClick={() => switchMode('login')}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${mode === 'login' ? 'bg-green-500 text-stone-950' : 'text-muted-foreground/70 hover:text-foreground/80'}`}
              >
                ⚔️ Entrar
              </button>
              <button
                onClick={() => switchMode('register')}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${mode === 'register' ? 'bg-green-500 text-stone-950' : 'text-muted-foreground/70 hover:text-foreground/80'}`}
              >
                🧙 Criar Personagem
              </button>
            </div>
          )}

          {/* Google — só em login/register */}
          {mode !== 'reset' && (
            <>
              <Button
                variant="outline"
                className="w-full gap-3 h-11 font-semibold border-border bg-card text-foreground/90 hover:bg-secondary hover:border-border transition-all"
                onClick={google}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Entrar com Google — 1 clique
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground/70">ou com e-mail</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-semibold text-muted-foreground">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all"
              />
            </div>

            {mode !== 'reset' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-semibold text-muted-foreground">Senha</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => switchMode('reset')} className="text-xs text-green-400 hover:text-green-300">
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground/80"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === 'register' && <PasswordStrengthBar password={password} />}
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-1">
                <label htmlFor="confirm-password" className="text-xs font-semibold text-muted-foreground">Confirmar senha</label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className={`h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 transition-all ${passwordMismatch ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : 'border-border focus:border-green-500/50 focus:ring-green-500/20'}`}
                />
                {passwordMismatch && (
                  <p className="text-xs text-red-400">As senhas não coincidem.</p>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                {success}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-green-500 hover:bg-green-400 text-stone-950 font-bold rounded-lg"
              disabled={busy}
            >
              {busy
                ? 'Aguarde…'
                : mode === 'login'
                ? '⚔️ Entrar no Realm'
                : mode === 'register'
                ? '🧙 Criar Personagem — Grátis'
                : '📨 Enviar link de redefinição'}
            </Button>

            {mode === 'register' && (
              <p className="text-xs text-muted-foreground/70 text-center leading-relaxed">
                Ao criar seu personagem você concorda com os{' '}
                <Link to="/termos" className="text-green-400 hover:underline" target="_blank">Termos de Uso</Link>
                {' '}e a{' '}
                <Link to="/privacidade" className="text-green-400 hover:underline" target="_blank">Política de Privacidade</Link>.
              </p>
            )}
          </form>
        </div>

        {mode === 'reset' && (
          <p className="text-center text-sm text-muted-foreground/70 mt-4">
            Lembrou a senha?{' '}
            <button className="font-semibold text-green-400 hover:text-green-300" onClick={() => switchMode('login')}>
              Voltar ao login
            </button>
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          <Link to="/" className="hover:text-muted-foreground transition-colors">← Voltar para o início</Link>
        </p>
      </div>
    </div>
  );
}

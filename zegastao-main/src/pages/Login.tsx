import { useState, type FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase';
import { authActions } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/Logo';
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

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
  if (score === 2) return { score: 2, label: 'Fraca', color: 'bg-orange-400' };
  if (score === 3) return { score: 3, label: 'Razoável', color: 'bg-yellow-400' };
  if (score === 4) return { score: 4, label: 'Boa', color: 'bg-blue-500' };
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
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? color : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="space-y-1">
        {requirements.map((r) => (
          <div key={r.text} className="flex items-center gap-1.5">
            {r.met ? (
              <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
            <span className={`text-xs ${r.met ? 'text-green-600' : 'text-muted-foreground'}`}>
              {r.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type Mode = 'login' | 'register' | 'reset';

export function Login() {
  const { user, authLoading } = useStore();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

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
        setSuccess('Link de redefinição enviado para ' + email + '. Verifique sua caixa de entrada.');
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
    login: 'Bem-vindo de volta',
    register: 'Crie sua conta',
    reset: 'Redefinir senha',
  };
  const SUBTITLES: Record<Mode, string> = {
    login: 'O Zé Gastão está te esperando.',
    register: 'Comece a sair das dívidas hoje. É grátis.',
    reset: 'Enviaremos um link para você redefinir sua senha.',
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Link to="/" className="mb-8">
        <Logo size="md" />
      </Link>

      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{TITLES[mode]}</h1>
          <p className="text-sm text-muted-foreground mt-1">{SUBTITLES[mode]}</p>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm p-6 space-y-4">
          {/* Google — só em login/register */}
          {mode !== 'reset' && (
            <>
              <Button variant="outline" className="w-full gap-3 h-12 font-semibold text-base border-2 hover:bg-accent hover:border-border transition-all" onClick={google}>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Entrar com Google — 1 clique
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">ou com e-mail</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>

            {mode !== 'reset' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === 'register' && <PasswordStrengthBar password={password} />}
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-1">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className={passwordMismatch ? 'border-destructive' : ''}
                />
                {passwordMismatch && (
                  <p className="text-xs text-destructive">As senhas não coincidem.</p>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg px-3 py-2">
                {success}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? 'Aguarde…'
                : mode === 'login'
                ? 'Entrar'
                : mode === 'register'
                ? 'Criar conta grátis'
                : 'Enviar link de redefinição'}
            </Button>

            {mode === 'register' && (
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Ao criar sua conta você concorda com os{' '}
                <Link to="/termos" className="text-primary hover:underline" target="_blank">Termos de Uso</Link>
                {' '}e a{' '}
                <Link to="/privacidade" className="text-primary hover:underline" target="_blank">Política de Privacidade</Link>.
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === 'login' && (
            <>Ainda não tem conta?{' '}
              <button className="font-semibold text-primary hover:underline" onClick={() => switchMode('register')}>
                Cadastre-se grátis
              </button>
            </>
          )}
          {mode === 'register' && (
            <>Já tem conta?{' '}
              <button className="font-semibold text-primary hover:underline" onClick={() => switchMode('login')}>
                Entrar
              </button>
            </>
          )}
          {mode === 'reset' && (
            <>Lembrou a senha?{' '}
              <button className="font-semibold text-primary hover:underline" onClick={() => switchMode('login')}>
                Voltar ao login
              </button>
            </>
          )}
        </p>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/" className="hover:underline">← Voltar para o início</Link>
        </p>
      </div>
    </div>
  );
}

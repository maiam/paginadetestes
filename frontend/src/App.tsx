import { useEffect, useMemo, useState } from 'react';
import { AuthPanel } from './components/AuthPanel';
import { fetchCurrentUser, logout, startGoogleLogin, type AuthUser } from './lib/auth';

const navigation = [
  { name: 'Dashboard', href: '#', current: true },
  { name: 'Agenda', href: '#', current: false },
  { name: 'Relatórios', href: '#', current: false },
];

function classNames(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('authError');
    if (error) {
      setAuthError(error);
      params.delete('authError');
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`.replace(/\?$/, ''));
    }
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const session = await fetchCurrentUser();
        setUser(session.authenticated ? session.user : null);
      } finally {
        setLoading(false);
      }
    }

    void loadUser();
  }, []);

  const authMessage = useMemo(() => {
    if (!authError) return null;
    if (authError === 'google_denied') return 'Login cancelado no Google.';
    if (authError === 'invalid_state') return 'Falha de segurança no retorno OAuth. Tente novamente.';
    return 'Não foi possível concluir o login.';
  }, [authError]);

  return (
    <div className="min-h-full bg-gray-100 dark:bg-zinc-950">
      <nav className="bg-gray-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline space-x-4">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                aria-current={item.current ? 'page' : undefined}
                className={classNames(
                  item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                  'rounded-md px-3 py-2 text-sm font-medium',
                )}
              >
                {item.name}
              </a>
            ))}
          </div>

          <AuthPanel
            user={user}
            loading={loading}
            onLogin={startGoogleLogin}
            onLogout={async () => {
              await logout();
              setUser(null);
            }}
          />
        </div>
      </nav>

      <header className="bg-white py-6 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {authMessage ? <p className="mb-4 rounded bg-red-100 p-3 text-red-700">{authMessage}</p> : null}
          <div className="rounded-lg bg-white p-6 shadow dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Estado da autenticação</h2>
            <p className="mt-2 text-zinc-700 dark:text-zinc-300">
              {user ? `Autenticado como ${user.email}.` : 'Nenhum usuário autenticado no momento.'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

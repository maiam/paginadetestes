import type { AuthUser } from '../lib/auth';

type AuthPanelProps = {
  user: AuthUser | null;
  loading: boolean;
  onLogin: () => void;
  onLogout: () => Promise<void>;
};

export function AuthPanel({ user, loading, onLogin, onLogout }: AuthPanelProps) {
  if (loading) {
    return <p className="text-sm text-gray-300">Validando sessão...</p>;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={onLogin}
        className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
      >
        Entrar com Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {user.picture ? (
        <img className="size-9 rounded-full" src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
      ) : (
        <div className="flex size-9 items-center justify-center rounded-full bg-indigo-500 text-white">
          {user.name.charAt(0)}
        </div>
      )}

      <div className="text-sm text-white">
        <p className="font-semibold">{user.name}</p>
        <p className="text-gray-300">{user.email}</p>
      </div>

      <button
        type="button"
        onClick={() => void onLogout()}
        className="rounded-md border border-gray-500 px-3 py-2 text-sm text-gray-100 hover:bg-white/10"
      >
        Sair
      </button>
    </div>
  );
}

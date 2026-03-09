export type AuthUser = {
  provider: 'google';
  sub: string;
  name: string;
  email: string;
  picture?: string;
};

export type AuthMeResponse =
  | { authenticated: false }
  | { authenticated: true; user: AuthUser };

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

export async function fetchCurrentUser(): Promise<AuthMeResponse> {
  const response = await fetch(apiUrl('/api/auth/me'), { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Falha ao consultar sessão atual');
  }

  return (await response.json()) as AuthMeResponse;
}

export function startGoogleLogin(): void {
  window.location.assign(apiUrl('/api/auth/google/login'));
}

export async function logout(): Promise<void> {
  const response = await fetch(apiUrl('/api/auth/logout'), {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Falha ao encerrar sessão');
  }
}

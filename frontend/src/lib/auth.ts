import { apiRequest, buildApiUrl } from './api';

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

export async function fetchCurrentUser(): Promise<AuthMeResponse> {
  const response = await apiRequest('/api/auth/me');
  if (!response.ok) {
    throw new Error('Falha ao consultar sessão atual');
  }

  return (await response.json()) as AuthMeResponse;
}

export function startGoogleLogin(): void {
  window.location.assign(buildApiUrl('/api/auth/google/login'));
}

export async function logout(): Promise<void> {
  const response = await apiRequest('/api/auth/logout', { method: 'POST' });

  if (!response.ok) {
    throw new Error('Falha ao encerrar sessão');
  }
}

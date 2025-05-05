import { apiRequest } from './queryClient';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  role: 'candidate' | 'employer';
}

interface User {
  id: number;
  email: string;
  role: 'candidate' | 'employer';
  createdAt: string;
}

export async function login(data: LoginData): Promise<User> {
  const response = await apiRequest('POST', '/api/auth/login', data);
  const user = await response.json();
  return user;
}

export async function register(data: RegisterData): Promise<User> {
  const response = await apiRequest('POST', '/api/auth/register', data);
  const user = await response.json();
  return user;
}

export async function logout(): Promise<void> {
  await apiRequest('POST', '/api/auth/logout');
}

export async function getMe(): Promise<User | null> {
  try {
    const response = await apiRequest('GET', '/api/auth/me');
    const user = await response.json();
    return user;
  } catch (error) {
    return null;
  }
}

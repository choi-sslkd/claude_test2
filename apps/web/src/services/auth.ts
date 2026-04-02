import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AdminUser;
}

export async function adminLogin(data: AdminLoginRequest): Promise<AdminLoginResponse> {
  const response = await axios.post<AdminLoginResponse>(
    `${API_BASE_URL}/admin/auth/login`,
    data
  );
  return response.data;
}

/** JWT 토큰을 포함한 헤더 생성 */
export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** JWT + Content-Type 헤더 */
export function authJsonHeaders(): Record<string, string> {
  return { ...authHeaders(), 'Content-Type': 'application/json' };
}

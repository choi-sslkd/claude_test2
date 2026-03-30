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
  user: AdminUser;
}

export async function adminLogin(data: AdminLoginRequest): Promise<AdminLoginResponse> {
  const response = await axios.post<AdminLoginResponse>(
    `${API_BASE_URL}/admin/auth/login`,
    data
  );
  return response.data;
}
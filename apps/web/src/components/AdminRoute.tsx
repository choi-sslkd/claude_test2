import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const token = localStorage.getItem('admin_access_token');
  const role = localStorage.getItem('admin_role');

  if (!token || role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store.js';

interface PrivateRouteProps {
  children: ReactNode;
}

/** Redirects to /login if the user is not authenticated */
export function PrivateRoute({ children }: PrivateRouteProps) {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

interface RoleGuardProps {
  children: ReactNode;
  permission: string;
  fallback?: ReactNode;
}

/** Renders children only if the user has the given permission */
export function RoleGuard({ children, permission, fallback = null }: RoleGuardProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

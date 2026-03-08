import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CurrentUser } from '@investor-backoffice/shared';

interface AuthState {
  token: string | null;
  user: CurrentUser | null;
  setAuth: (token: string, user: CurrentUser) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: (token, user) => set({ token, user }),

      logout: () => {
        set({ token: null, user: null });
        window.location.href = '/login';
      },

      hasPermission: (permission: string): boolean => {
        const { user } = get();
        if (!user) return false;
        if (user.isAdmin) return true;
        return user.permissions.includes(permission);
      },
    }),
    {
      name: 'auth-storage',
      // Only persist token and user (not methods)
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);

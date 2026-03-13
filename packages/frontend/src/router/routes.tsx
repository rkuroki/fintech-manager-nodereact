import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';
import { PrivateRoute } from './guards.js';
import { AppLayout } from '../components/layout/AppLayout.js';

const LoginPage = lazy(() => import('../pages/Login/LoginPage.js'));
const DashboardPage = lazy(() => import('../pages/Dashboard/DashboardPage.js'));
const UsersPage = lazy(() => import('../pages/Users/UsersPage.js'));
const GroupsPage = lazy(() => import('../pages/Groups/GroupsPage.js'));
const CustomersPage = lazy(() => import('../pages/Customers/CustomersPage.js'));
const CustomerPage = lazy(() => import('../pages/Customers/CustomerPage.js'));
const AuditPage = lazy(() => import('../pages/Audit/AuditPage.js'));
const ActivityPage = lazy(() => import('../pages/Audit/ActivityPage.js'));

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<Loading />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<Loading />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'customers',
        element: (
          <Suspense fallback={<Loading />}>
            <CustomersPage />
          </Suspense>
        ),
      },
      {
        // Handles both /customers/new and /customers/:mnemonic
        path: 'customers/:mnemonic',
        element: (
          <Suspense fallback={<Loading />}>
            <CustomerPage />
          </Suspense>
        ),
      },
      {
        path: 'users',
        element: (
          <Suspense fallback={<Loading />}>
            <UsersPage />
          </Suspense>
        ),
      },
      {
        path: 'groups',
        element: (
          <Suspense fallback={<Loading />}>
            <GroupsPage />
          </Suspense>
        ),
      },
      {
        path: 'audit',
        element: (
          <Suspense fallback={<Loading />}>
            <AuditPage />
          </Suspense>
        ),
      },
      {
        path: 'activity',
        element: (
          <Suspense fallback={<Loading />}>
            <ActivityPage />
          </Suspense>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

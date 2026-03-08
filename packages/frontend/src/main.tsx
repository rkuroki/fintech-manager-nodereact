import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import enUS from 'antd/locale/en_US';
import { enUSIntl, ProConfigProvider } from '@ant-design/pro-components';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/routes.js';
import './i18n/index.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // Data is fresh for 30 seconds
      retry: 1,                // Retry failed requests once
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={enUS}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          },
          components: {
            Layout: {
              siderBg: '#001529',
              headerBg: '#ffffff',
            },
          },
        }}
      >
        <AntApp>
          <ProConfigProvider intl={enUSIntl}>
            <RouterProvider router={router} />
          </ProConfigProvider>
        </AntApp>
      </ConfigProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>,
);

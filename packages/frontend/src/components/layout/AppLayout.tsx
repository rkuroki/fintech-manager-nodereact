import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Button } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  AuditOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyOutlined,
  HistoryOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/auth.store.js';
import { PERMISSIONS } from '@investor-backoffice/shared';

const { Header, Sider, Content } = Layout;

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  permission?: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/customers', icon: <TeamOutlined />, label: 'Customers', permission: PERMISSIONS.CUSTOMERS_READ },
  { key: '/users', icon: <UserOutlined />, label: 'Users', adminOnly: true },
  { key: '/groups', icon: <UsergroupAddOutlined />, label: 'Groups', adminOnly: true },
  { key: '/audit', icon: <AuditOutlined />, label: 'Audit Log', permission: PERMISSIONS.AUDIT_READ },
  { key: '/activity', icon: <HistoryOutlined />, label: 'Activity', permission: PERMISSIONS.ACTIVITY_READ },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) return user?.isAdmin;
    if (item.permission) return hasPermission(item.permission);
    return true;
  });

  const menuItems = visibleItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    onClick: () => navigate(item.key),
  }));

  const selectedKey = visibleItems.find((i) => location.pathname.startsWith(i.key))?.key ?? '/dashboard';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{ background: '#001529' }}
        width={220}
      >
        <div style={{ padding: collapsed ? '16px 8px' : '16px 24px', color: '#fff', whiteSpace: 'nowrap' }}>
          <SafetyOutlined style={{ fontSize: 20, marginRight: collapsed ? 0 : 8 }} />
          {!collapsed && (
            <Typography.Text strong style={{ color: '#fff', fontSize: 14 }}>
              Investor BO
            </Typography.Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 40, height: 40 }}
          />

          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'Logout',
                  onClick: logout,
                },
              ],
            }}
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} size="small" />
              <Typography.Text>{user?.fullName}</Typography.Text>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

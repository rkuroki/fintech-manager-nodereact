import { Card, Col, Row, Statistic, Typography } from 'antd';
import { TeamOutlined, UserOutlined, AuditOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../../api/customers.api.js';
import { usersApi } from '../../api/users.api.js';
import { useAuthStore } from '../../store/auth.store.js';
import { PERMISSIONS } from '@investor-backoffice/shared';

export default function DashboardPage() {
  const { hasPermission, user } = useAuthStore();

  const customersQuery = useQuery({
    queryKey: ['customers', 'count'],
    queryFn: () => customersApi.list({ pageSize: 1 }),
    enabled: hasPermission(PERMISSIONS.CUSTOMERS_READ),
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'count'],
    queryFn: () => usersApi.list({ pageSize: 1 }),
    enabled: user?.isAdmin ?? false,
  });

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>
        Dashboard
      </Typography.Title>

      <Row gutter={16}>
        {hasPermission(PERMISSIONS.CUSTOMERS_READ) && (
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Total Customers"
                value={customersQuery.data?.total ?? '-'}
                prefix={<TeamOutlined />}
                loading={customersQuery.isLoading}
              />
            </Card>
          </Col>
        )}

        {user?.isAdmin && (
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Total Users"
                value={usersQuery.data?.total ?? '-'}
                prefix={<UserOutlined />}
                loading={usersQuery.isLoading}
              />
            </Card>
          </Col>
        )}

        {hasPermission(PERMISSIONS.AUDIT_READ) && (
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic title="Audit Log" value="View" prefix={<AuditOutlined />} />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}

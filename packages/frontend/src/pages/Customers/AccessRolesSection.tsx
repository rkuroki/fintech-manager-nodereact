import { useState, useEffect } from 'react';
import { Card, Checkbox, Button, Skeleton, Alert, App, Space, Typography } from 'antd';
import { SaveOutlined, LockOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Customer } from '@investor-backoffice/shared';
import { PERMISSIONS } from '@investor-backoffice/shared';
import { customersApi } from '../../api/customers.api.js';
import { usersApi } from '../../api/users.api.js';
import { useAuthStore } from '../../store/auth.store.js';

interface Props {
  customer: Customer;
}

export function AccessRolesSection({ customer }: Props) {
  const { hasPermission, user } = useAuthStore();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // Managers have CUSTOMERS_WRITE_SENSITIVE; admins have isAdmin = true
  const canManage =
    user?.isAdmin || hasPermission(PERMISSIONS.CUSTOMERS_WRITE_SENSITIVE);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  const { data: allRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => usersApi.listRoles(),
    enabled: hasPermission(PERMISSIONS.CUSTOMERS_READ),
  });

  const { data: assigned, isLoading: assignedLoading } = useQuery({
    queryKey: ['customers', customer.id, 'roles'],
    queryFn: () => customersApi.listRoles(customer.id),
    enabled: hasPermission(PERMISSIONS.CUSTOMERS_READ),
  });

  // Sync checked state when assigned roles load
  useEffect(() => {
    if (assigned) {
      setSelectedIds(assigned.map((r) => r.roleId));
      setDirty(false);
    }
  }, [assigned]);

  const saveMutation = useMutation({
    mutationFn: () => customersApi.updateRoles(customer.id, selectedIds),
    onSuccess: () => {
      message.success('Access roles updated');
      queryClient.invalidateQueries({ queryKey: ['customers', customer.id, 'roles'] });
      setDirty(false);
    },
    onError: () => message.error('Failed to update access roles'),
  });

  const isLoading = rolesLoading || assignedLoading;

  const toggle = (roleId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, roleId] : prev.filter((id) => id !== roleId),
    );
    setDirty(true);
  };

  return (
    <Card
      title={
        <span>
          <LockOutlined style={{ marginRight: 8 }} />
          Associated Access Roles
        </span>
      }
      style={{ marginBottom: 24 }}
      extra={
        canManage && dirty ? (
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Save Changes
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <Skeleton active />
      ) : !canManage ? (
        <>
          <Alert
            type="info"
            message="Only managers can edit access role assignments."
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Space direction="vertical">
            {(assigned ?? []).length === 0 ? (
              <Typography.Text type="secondary">No roles assigned.</Typography.Text>
            ) : (
              assigned!.map((r) => (
                <Typography.Text key={r.roleId}>• {r.roleName}</Typography.Text>
              ))
            )}
          </Space>
        </>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {(allRoles ?? []).map((role) => (
            <Checkbox
              key={role.id}
              checked={selectedIds.includes(role.id)}
              onChange={(e) => toggle(role.id, e.target.checked)}
            >
              <span>
                <strong>{role.name}</strong>
                {role.description && (
                  <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    {role.description}
                  </Typography.Text>
                )}
              </span>
            </Checkbox>
          ))}
          {canManage && dirty && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              style={{ marginTop: 8 }}
            >
              Save Changes
            </Button>
          )}
        </Space>
      )}
    </Card>
  );
}

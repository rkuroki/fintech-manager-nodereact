import { useRef, useState } from 'react';
import { ProTable, type ProColumns, type ActionType } from '@ant-design/pro-components';
import { Button, Tag, Space, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import type { User } from '@investor-backoffice/shared';
import { usersApi } from '../../api/users.api.js';
import { useAuthStore } from '../../store/auth.store.js';
import { confirm } from '../../components/common/ConfirmModal.js';
import { UserFormDrawer } from './UserFormDrawer.js';

export default function UsersPage() {
  const tableRef = useRef<ActionType>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | undefined>();
  const { user: currentUser } = useAuthStore();
  const { message } = App.useApp();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      message.success('User deleted');
      tableRef.current?.reload();
    },
    onError: () => message.error('Failed to delete user'),
  });

  const columns: ProColumns<User>[] = [
    { title: 'Alias', dataIndex: 'alias', width: 120, render: (_, r) => `@${r.alias}` },
    { title: 'Full Name', dataIndex: 'fullName', ellipsis: true },
    { title: 'Email', dataIndex: 'email', ellipsis: true },
    {
      title: 'Role',
      dataIndex: 'isAdmin',
      width: 100,
      render: (_, r) =>
        r.isAdmin ? <Tag color="red">Admin</Tag> : <Tag color="default">User</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      width: 90,
      render: (_, r) =>
        r.isActive ? <Tag color="green">Active</Tag> : <Tag color="default">Inactive</Tag>,
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditUser(record);
              setDrawerOpen(true);
            }}
          />
          {record.id !== currentUser?.id && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() =>
                confirm({
                  title: `Delete @${record.alias}?`,
                  content: 'This will deactivate the user. They will no longer be able to log in.',
                  danger: true,
                  onConfirm: () => deleteMutation.mutate(record.id),
                })
              }
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<User>
        actionRef={tableRef}
        headerTitle="Users"
        columns={columns}
        rowKey="id"
        request={async (params) => {
          const result = await usersApi.list({
            page: params.current,
            pageSize: params.pageSize,
            search: params.keyword,
          });
          return { data: result.data, total: result.total, success: true };
        }}
        search={{ labelWidth: 'auto' }}
        toolbar={{
          actions: [
            <Button
              key="create"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditUser(undefined);
                setDrawerOpen(true);
              }}
            >
              New User
            </Button>,
          ],
        }}
      />

      <UserFormDrawer
        open={drawerOpen}
        {...(editUser !== undefined && { user: editUser })}
        onClose={() => {
          setDrawerOpen(false);
          setEditUser(undefined);
        }}
        onSuccess={() => {
          setDrawerOpen(false);
          setEditUser(undefined);
          tableRef.current?.reload();
        }}
      />
    </>
  );
}

import { useRef, useState } from 'react';
import { ProTable, type ProColumns, type ActionType } from '@ant-design/pro-components';
import { Button, Tag, App, Space } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { Customer } from '@investor-backoffice/shared';
import { PERMISSIONS } from '@investor-backoffice/shared';
import { customersApi } from '../../api/customers.api.js';
import { useAuthStore } from '../../store/auth.store.js';
import { confirm } from '../../components/common/ConfirmModal.js';
import { CustomerFormDrawer } from './CustomerFormDrawer.js';

const riskProfileColor = {
  conservative: 'blue',
  moderate: 'orange',
  aggressive: 'red',
} as const;

export default function CustomersPage() {
  const tableRef = useRef<ActionType>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const canCreate = hasPermission(PERMISSIONS.CUSTOMERS_CREATE);
  const canDelete = hasPermission(PERMISSIONS.CUSTOMERS_DELETE);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => {
      message.success('Customer deleted');
      tableRef.current?.reload();
    },
    onError: () => message.error('Failed to delete customer'),
  });

  const columns: ProColumns<Customer>[] = [
    {
      title: 'ID',
      dataIndex: 'mnemonic',
      width: 110,
      copyable: true,
      fixed: 'left',
    },
    {
      title: 'Full Name',
      dataIndex: 'fullName',
      ellipsis: true,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      ellipsis: true,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
    },
    {
      title: 'Risk Profile',
      dataIndex: 'riskProfile',
      width: 140,
      render: (_, record) =>
        record.riskProfile ? (
          <Tag color={riskProfileColor[record.riskProfile]}>{record.riskProfile}</Tag>
        ) : (
          '—'
        ),
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/customers/${record.id}`)}
          />
          {canDelete && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() =>
                confirm({
                  title: `Delete ${record.mnemonic}?`,
                  content: `This will soft-delete ${record.fullName}. The record can be recovered from the audit log.`,
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
      <ProTable<Customer>
        actionRef={tableRef}
        headerTitle="Customers"
        columns={columns}
        rowKey="id"
        scroll={{ x: 800 }}
        request={async (params) => {
          const result = await customersApi.list({
            page: params.current,
            pageSize: params.pageSize,
            search: params.keyword,
          });
          return { data: result.data, total: result.total, success: true };
        }}
        search={{ labelWidth: 'auto' }}
        toolbar={{
          actions: canCreate
            ? [
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setDrawerOpen(true)}
                >
                  New Customer
                </Button>,
              ]
            : [],
        }}
      />

      <CustomerFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          setDrawerOpen(false);
          tableRef.current?.reload();
        }}
      />
    </>
  );
}

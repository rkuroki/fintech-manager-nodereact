import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { Tag } from 'antd';
import type { ActivityLogEntry } from '@investor-backoffice/shared';
import { auditApi } from '../../api/audit.api.js';

export default function ActivityPage() {
  const columns: ProColumns<ActivityLogEntry>[] = [
    { title: 'When', dataIndex: 'occurredAt', valueType: 'dateTime', width: 160, sorter: true },
    {
      title: 'Action',
      dataIndex: 'action',
      width: 120,
      render: (_, r) => (
        <Tag color={r.action === 'LOGIN' ? 'green' : r.action === 'LOGOUT' ? 'orange' : 'blue'}>
          {r.action}
        </Tag>
      ),
    },
    { title: 'User ID', dataIndex: 'userId', copyable: true, ellipsis: true },
    {
      title: 'Details',
      dataIndex: 'metadata',
      render: (_, r) => (r.metadata ? JSON.stringify(r.metadata) : '—'),
      ellipsis: true,
    },
  ];

  return (
    <ProTable<ActivityLogEntry>
      headerTitle="User Activity"
      columns={columns}
      rowKey="id"
      request={async (params) => {
        const result = await auditApi.listActivity({
          page: params.current,
          pageSize: params.pageSize,
        });
        return { data: result.data, total: result.data.length, success: true };
      }}
      search={false}
      options={{ reload: true }}
    />
  );
}

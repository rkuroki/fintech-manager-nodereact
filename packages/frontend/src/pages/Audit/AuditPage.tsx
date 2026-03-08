import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { Tag, Typography } from 'antd';
import type { AuditLogEntry, AuditAction } from '@investor-backoffice/shared';
import { auditApi } from '../../api/audit.api.js';

const actionColor: Record<AuditAction, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  READ_SENSITIVE: 'orange',
};

export default function AuditPage() {
  const columns: ProColumns<AuditLogEntry>[] = [
    {
      title: 'When',
      dataIndex: 'actionAt',
      valueType: 'dateTime',
      width: 160,
      sorter: true,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      width: 140,
      render: (_, r) => <Tag color={actionColor[r.action]}>{r.action}</Tag>,
    },
    { title: 'Entity Type', dataIndex: 'entityType', width: 140 },
    { title: 'Entity ID', dataIndex: 'entityId', copyable: true, ellipsis: true },
    { title: 'By', dataIndex: 'actionBy', ellipsis: true, copyable: true },
    { title: 'IP', dataIndex: 'ipAddress', width: 130 },
    {
      title: 'Before / After',
      render: (_, r) => (
        <Typography.Text
          style={{ fontSize: 11 }}
          type="secondary"
          ellipsis={{ tooltip: JSON.stringify({ before: r.beforeValue, after: r.afterValue }, null, 2) }}
        >
          {r.afterValue ? JSON.stringify(r.afterValue).substring(0, 60) + '…' : '—'}
        </Typography.Text>
      ),
    },
  ];

  return (
    <ProTable<AuditLogEntry>
      headerTitle="Audit Log"
      columns={columns}
      rowKey="id"
      request={async (params) => {
        const result = await auditApi.listAudit({
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

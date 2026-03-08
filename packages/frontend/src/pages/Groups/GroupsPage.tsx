import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { Tag } from 'antd';
import type { UserGroup } from '@investor-backoffice/shared';
import { apiClient } from '../../api/client.js';
import type { PaginatedResponse } from '@investor-backoffice/shared';

export default function GroupsPage() {
  const columns: ProColumns<UserGroup>[] = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    {
      title: 'Status',
      dataIndex: 'deletedAt',
      width: 90,
      render: (_, r) =>
        r.deletedAt ? <Tag color="default">Inactive</Tag> : <Tag color="green">Active</Tag>,
    },
    { title: 'Created', dataIndex: 'createdAt', valueType: 'dateTime', width: 160 },
  ];

  return (
    <ProTable<UserGroup>
      headerTitle="User Groups"
      columns={columns}
      rowKey="id"
      request={async (params) => {
        const result = await apiClient
          .get<PaginatedResponse<UserGroup>>('/users/groups', {
            params: { page: params.current, pageSize: params.pageSize },
          })
          .then((r) => r.data);
        return { data: result.data, total: result.total, success: true };
      }}
      search={false}
    />
  );
}

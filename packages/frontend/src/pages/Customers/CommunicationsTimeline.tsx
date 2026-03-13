import { useState } from 'react';
import {
  Card,
  Timeline,
  Button,
  Space,
  Typography,
  Tag,
  Empty,
  Skeleton,
  App,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  MessageOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { CommunicationRecord } from '@investor-backoffice/shared';
import { PERMISSIONS } from '@investor-backoffice/shared';
import { customersApi } from '../../api/customers.api.js';
import { useAuthStore } from '../../store/auth.store.js';
import { CommunicationFormDrawer } from './CommunicationFormDrawer.js';

const channelIcon: Record<string, React.ReactNode> = {
  email: <MailOutlined />,
  phone: <PhoneOutlined />,
  whatsapp: <MessageOutlined />,
  meeting: <TeamOutlined />,
  other: <MessageOutlined />,
};

const channelColor: Record<string, string> = {
  email: 'blue',
  phone: 'green',
  whatsapp: 'cyan',
  meeting: 'purple',
  other: 'default',
};

interface Props {
  customerId: string;
}

export function CommunicationsTimeline({ customerId }: Props) {
  const { hasPermission } = useAuthStore();
  const { modal, message } = App.useApp();
  const queryClient = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingComm, setEditingComm] = useState<CommunicationRecord | undefined>();

  const canRead = hasPermission(PERMISSIONS.COMMUNICATIONS_READ);
  const canEdit = hasPermission(PERMISSIONS.COMMUNICATIONS_CREATE);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', customerId, 'communications'],
    queryFn: () => customersApi.listCommunications(customerId, { page: 1, pageSize: 100 }),
    enabled: canRead,
  });

  const deleteMutation = useMutation({
    mutationFn: (commId: string) => customersApi.deleteCommunication(customerId, commId),
    onSuccess: () => {
      message.success('Communication deleted');
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'communications'] });
    },
    onError: () => message.error('Failed to delete communication'),
  });

  const confirmDelete = (comm: CommunicationRecord) => {
    modal.confirm({
      title: 'Delete communication record?',
      content: 'This action cannot be undone.',
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(comm.id),
    });
  };

  const comms = [...(data?.data ?? [])].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return (
    <>
      <Card
        title="Communication History"
        style={{ marginBottom: 24 }}
        extra={
          canEdit && (
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => { setEditingComm(undefined); setDrawerOpen(true); }}
            >
              Add Communication
            </Button>
          )
        }
      >
        {isLoading ? (
          <Skeleton active />
        ) : comms.length === 0 ? (
          <Empty description="No communications recorded" />
        ) : (
          <Timeline
            items={comms.map((comm) => ({
              key: comm.id,
              dot: channelIcon[comm.channel] ?? <MessageOutlined />,
              children: (
                <div>
                  <Space size="small" style={{ marginBottom: 4 }}>
                    <Tag color={channelColor[comm.channel] ?? 'default'}>{comm.channel}</Tag>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(comm.occurredAt).format('MMM D, YYYY HH:mm')}
                    </Typography.Text>
                  </Space>
                  <Typography.Paragraph style={{ marginBottom: 4, whiteSpace: 'pre-wrap' }}>
                    {comm.summary}
                  </Typography.Paragraph>
                  {canEdit && (
                    <Space size="small">
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => { setEditingComm(comm); setDrawerOpen(true); }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => confirmDelete(comm)}
                      >
                        Delete
                      </Button>
                    </Space>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Card>

      <CommunicationFormDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingComm(undefined); }}
        customerId={customerId}
        {...(editingComm ? { communication: editingComm } : {})}
      />
    </>
  );
}

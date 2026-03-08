import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Descriptions,
  Typography,
  Tag,
  Button,
  Tabs,
  Skeleton,
  Result,
  Timeline,
  Space,
  message,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  MailOutlined,
  PhoneOutlined,
  MessageOutlined,
  TeamOutlined,
  SyncOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import type { CustomerWithSensitive, TimelineEntry, GmailMessage, CommunicationRecord } from '@investor-backoffice/shared';
import { PERMISSIONS } from '@investor-backoffice/shared';
import { customersApi } from '../../api/customers.api.js';
import { gmailApi } from '../../api/gmail.api.js';
import { useAuthStore } from '../../store/auth.store.js';
import { SensitiveField } from '../../components/common/SensitiveField.js';
import { GmailConnectButton } from '../../components/common/GmailConnectButton.js';

const riskProfileColor = { conservative: 'blue', moderate: 'orange', aggressive: 'red' } as const;

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const canReadSensitive = hasPermission(PERMISSIONS.CUSTOMERS_READ_SENSITIVE);

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <Skeleton active />;
  if (error || !customer) {
    return (
      <Result
        status="404"
        title="Customer not found"
        extra={<Button onClick={() => navigate('/customers')}>Back to Customers</Button>}
      />
    );
  }

  const c = customer as CustomerWithSensitive;

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={() => navigate('/customers')}
        style={{ marginBottom: 16 }}
      >
        Back
      </Button>

      <Typography.Title level={4} style={{ marginBottom: 24 }}>
        {c.fullName}
        <Tag
          color="default"
          style={{ marginLeft: 12, fontFamily: 'monospace', fontSize: 12 }}
        >
          {c.mnemonic}
        </Tag>
        {c.riskProfile && (
          <Tag color={riskProfileColor[c.riskProfile as keyof typeof riskProfileColor]} style={{ marginLeft: 4 }}>
            {c.riskProfile}
          </Tag>
        )}
      </Typography.Title>

      <Tabs
        items={[
          {
            key: 'general',
            label: 'General Info',
            children: (
              <Card>
                <Descriptions column={2} bordered>
                  <Descriptions.Item label="Full Name">{c.fullName}</Descriptions.Item>
                  <Descriptions.Item label="Email">{c.email ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Phone">{c.phone ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Risk Profile">
                    {c.riskProfile ? (
                      <Tag color={riskProfileColor[c.riskProfile as keyof typeof riskProfileColor]}>
                        {c.riskProfile}
                      </Tag>
                    ) : (
                      '—'
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tax ID (CPF/CNPJ)" span={2}>
                    <SensitiveField value={c.taxId} visible={canReadSensitive} label="Tax ID" />
                  </Descriptions.Item>
                  <Descriptions.Item label="Date of Birth" span={2}>
                    <SensitiveField value={c.dateOfBirth} visible={canReadSensitive} label="Date of Birth" />
                  </Descriptions.Item>
                  <Descriptions.Item label="Address" span={2}>
                    <SensitiveField value={c.address} visible={canReadSensitive} label="Address" />
                  </Descriptions.Item>
                  <Descriptions.Item label="Bank Details" span={2}>
                    <SensitiveField value={c.bankDetails} visible={canReadSensitive} label="Bank Details" />
                  </Descriptions.Item>
                  <Descriptions.Item label="Investor Notes" span={2}>
                    {c.investorNotes ?? '—'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'profile',
            label: 'Investor Profile',
            children: <InvestorProfileTab customerId={c.id} />,
          },
          {
            key: 'communications',
            label: 'Communications',
            children: <CommunicationsTab customerId={c.id} />,
          },
        ]}
      />
    </div>
  );
}

function InvestorProfileTab({ customerId }: { customerId: string }) {
  const { hasPermission } = useAuthStore();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['customers', customerId, 'profile'],
    queryFn: () => customersApi.getProfile(customerId),
    enabled: hasPermission(PERMISSIONS.INVESTOR_PROFILES_READ),
  });

  if (isLoading) return <Skeleton active />;
  if (!profile) return <Typography.Text type="secondary">No investor profile yet.</Typography.Text>;

  return (
    <Card>
      <Typography.Paragraph>
        <strong>Notes:</strong> {profile.notes ?? '—'}
      </Typography.Paragraph>
      {profile.formResponses && (
        <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
          {JSON.stringify(profile.formResponses, null, 2)}
        </pre>
      )}
    </Card>
  );
}

/** Icon for each communication channel */
const channelIcon: Record<string, React.ReactNode> = {
  email: <MailOutlined />,
  phone: <PhoneOutlined />,
  whatsapp: <MessageOutlined />,
  meeting: <TeamOutlined />,
  other: <MessageOutlined />,
};

/** Color for channel tags */
const channelColor: Record<string, string> = {
  email: 'blue',
  phone: 'green',
  whatsapp: 'cyan',
  meeting: 'purple',
  other: 'default',
};

function CommunicationsTab({ customerId }: { customerId: string }) {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [syncing, setSyncing] = useState(false);
  const [useTimeline, setUseTimeline] = useState(true);

  // Detect OAuth callback redirect
  useEffect(() => {
    if (searchParams.get('gmailConnected') === 'true') {
      queryClient.invalidateQueries({ queryKey: ['gmail'] });
      message.success('Gmail connected successfully!');
    }
  }, [searchParams, queryClient]);

  // Try unified timeline first
  const {
    data: timelineData,
    isLoading: timelineLoading,
    error: timelineError,
  } = useQuery({
    queryKey: ['gmail', 'timeline', customerId],
    queryFn: () => gmailApi.getTimeline(customerId),
    enabled: hasPermission(PERMISSIONS.COMMUNICATIONS_READ) && useTimeline,
    retry: false,
  });

  // Fallback to manual-only if timeline endpoint is not available (501/403)
  const {
    data: manualData,
    isLoading: manualLoading,
  } = useQuery({
    queryKey: ['customers', customerId, 'communications'],
    queryFn: () => customersApi.listCommunications(customerId),
    enabled: hasPermission(PERMISSIONS.COMMUNICATIONS_READ) && !useTimeline,
  });

  // Switch to fallback mode if timeline endpoint fails
  useEffect(() => {
    if (timelineError) {
      setUseTimeline(false);
    }
  }, [timelineError]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await gmailApi.syncEmails(customerId);
      message.success(`Synced ${result.synced} email(s)`);
      queryClient.invalidateQueries({ queryKey: ['gmail', 'timeline', customerId] });
    } catch {
      message.error('Failed to sync emails');
    } finally {
      setSyncing(false);
    }
  };

  const isLoading = useTimeline ? timelineLoading : manualLoading;
  if (isLoading) return <Skeleton active />;

  // Render unified timeline
  if (useTimeline && timelineData) {
    return (
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <GmailConnectButton />
          {hasPermission(PERMISSIONS.GMAIL_SYNC) && (
            <Button
              icon={<SyncOutlined spin={syncing} />}
              onClick={handleSync}
              loading={syncing}
              size="small"
            >
              Sync Emails
            </Button>
          )}
        </div>

        {timelineData.data.length === 0 ? (
          <Empty description="No communications yet" />
        ) : (
          <Timeline
            items={timelineData.data.map((entry) => ({
              key: entry.id,
              dot: entry.type === 'gmail' ? (
                <MailOutlined style={{ fontSize: 16, color: isGmailInbound(entry) ? '#f5222d' : '#52c41a' }} />
              ) : (
                channelIcon[(entry.data as CommunicationRecord).channel] || <MessageOutlined />
              ),
              children: entry.type === 'gmail'
                ? renderGmailEntry(entry)
                : renderManualEntry(entry),
            }))}
          />
        )}
      </Card>
    );
  }

  // Fallback: manual-only view (original behavior)
  return (
    <Card>
      {manualData?.data.length === 0 && (
        <Typography.Text type="secondary">No communications recorded.</Typography.Text>
      )}
      {manualData?.data.map((comm) => (
        <Card.Grid key={comm.id} style={{ width: '100%', cursor: 'default' }}>
          <Tag>{comm.channel}</Tag>
          <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            {new Date(comm.occurredAt).toLocaleString()}
          </Typography.Text>
          <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
            {comm.summary}
          </Typography.Paragraph>
        </Card.Grid>
      ))}
    </Card>
  );
}

/** Check if a Gmail timeline entry is inbound */
function isGmailInbound(entry: TimelineEntry): boolean {
  if (entry.type !== 'gmail') return false;
  return (entry.data as GmailMessage).direction === 'inbound';
}

/** Render a Gmail message timeline entry */
function renderGmailEntry(entry: TimelineEntry) {
  const msg = entry.data as GmailMessage;
  const directionIcon = msg.direction === 'inbound' ? <ArrowDownOutlined /> : <ArrowUpOutlined />;
  const directionColor = msg.direction === 'inbound' ? '#f5222d' : '#52c41a';
  const directionLabel = msg.direction === 'inbound' ? 'Received' : 'Sent';

  return (
    <div>
      <Space size="small" style={{ marginBottom: 4 }}>
        <Tag color={directionColor} icon={directionIcon}>
          {directionLabel}
        </Tag>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(msg.receivedAt).toLocaleString()}
        </Typography.Text>
      </Space>
      <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
        {msg.subject || '(No subject)'}
      </Typography.Text>
      {msg.snippet && (
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {msg.snippet}
        </Typography.Text>
      )}
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
        {msg.direction === 'inbound' ? `From: ${msg.from}` : `To: ${msg.to}`}
      </div>
    </div>
  );
}

/** Render a manual communication timeline entry */
function renderManualEntry(entry: TimelineEntry) {
  const comm = entry.data as CommunicationRecord;
  return (
    <div>
      <Space size="small" style={{ marginBottom: 4 }}>
        <Tag color={channelColor[comm.channel] ?? 'default'}>
          {comm.channel}
        </Tag>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(comm.occurredAt).toLocaleString()}
        </Typography.Text>
      </Space>
      <Typography.Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
        {comm.summary}
      </Typography.Paragraph>
    </div>
  );
}

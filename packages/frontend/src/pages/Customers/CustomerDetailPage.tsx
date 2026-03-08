import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Descriptions,
  Typography,
  Tag,
  Button,
  Tabs,
  Skeleton,
  Result,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { CustomerWithSensitive } from '@investor-backoffice/shared';
import { PERMISSIONS } from '@investor-backoffice/shared';
import { customersApi } from '../../api/customers.api.js';
import { useAuthStore } from '../../store/auth.store.js';
import { SensitiveField } from '../../components/common/SensitiveField.js';

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

function CommunicationsTab({ customerId }: { customerId: string }) {
  const { hasPermission } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['customers', customerId, 'communications'],
    queryFn: () => customersApi.listCommunications(customerId),
    enabled: hasPermission(PERMISSIONS.COMMUNICATIONS_READ),
  });

  if (isLoading) return <Skeleton active />;

  return (
    <Card>
      {data?.data.length === 0 && (
        <Typography.Text type="secondary">No communications recorded.</Typography.Text>
      )}
      {data?.data.map((comm) => (
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

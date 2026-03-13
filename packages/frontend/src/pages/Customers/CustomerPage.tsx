import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Typography,
  Tag,
  Skeleton,
  Result,
  Form,
  Input,
  Select,
  Card,
  Space,
  App,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import type { Customer, CustomerWithSensitive, CreateCustomerDto } from '@investor-backoffice/shared';
import { PERMISSIONS } from '@investor-backoffice/shared';
import { customersApi } from '../../api/customers.api.js';
import { useAuthStore } from '../../store/auth.store.js';
import { BasicInfoSection } from './BasicInfoSection.js';
import { SensitiveInfoSection } from './SensitiveInfoSection.js';
import { NotesFilesTimeline } from './NotesFilesTimeline.js';
import { CommunicationsTimeline } from './CommunicationsTimeline.js';
import { AccessRolesSection } from './AccessRolesSection.js';

const riskColor = { conservative: 'blue', moderate: 'orange', aggressive: 'red' } as const;

export default function CustomerPage() {
  const { mnemonic } = useParams<{ mnemonic: string }>();
  const navigate = useNavigate();
  const isNew = mnemonic === 'new';

  if (isNew) {
    return <CreateCustomerForm />;
  }

  return <ViewCustomerPage mnemonic={mnemonic!} />;
}

// ─── Create Mode ────────────────────────────────────────────────────────────

function CreateCustomerForm() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateCustomerDto>();
  const canWriteSensitive = hasPermission(PERMISSIONS.CUSTOMERS_WRITE_SENSITIVE);

  const createMutation = useMutation({
    mutationFn: (dto: CreateCustomerDto) => customersApi.create(dto),
    onSuccess: (customer) => {
      message.success('Customer created');
      navigate(`/customers/${customer.mnemonic}`);
    },
    onError: () => message.error('Failed to create customer'),
  });

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={() => navigate('/customers')}
        style={{ marginBottom: 16 }}
      >
        Back to Customers
      </Button>

      <Typography.Title level={4} style={{ marginBottom: 24 }}>
        New Customer
      </Typography.Title>

      <Card title="Customer Information" style={{ maxWidth: 680 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => createMutation.mutate(v)}
        >
          <Form.Item name="mnemonic" label="Mnemonic ID (leave blank to auto-generate)">
            <Input
              placeholder="e.g. SILVA001"
              maxLength={12}
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>

          <Form.Item
            name="fullName"
            label="Full Name"
            rules={[{ required: true, message: 'Full name is required' }]}
          >
            <Input placeholder="Customer full name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Invalid email' }]}
          >
            <Input placeholder="customer@email.com" />
          </Form.Item>

          <Form.Item name="phone" label="Phone">
            <Input placeholder="+55 11 99999-9999" />
          </Form.Item>

          <Form.Item name="riskProfile" label="Risk Profile">
            <Select placeholder="Select risk profile" allowClear>
              <Select.Option value="conservative">Conservative</Select.Option>
              <Select.Option value="moderate">Moderate</Select.Option>
              <Select.Option value="aggressive">Aggressive</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="investorNotes" label="Investor Notes">
            <Input.TextArea rows={3} placeholder="Internal notes about this customer" />
          </Form.Item>

          {canWriteSensitive && (
            <>
              <div
                style={{
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: 16,
                  marginBottom: 16,
                }}
              >
                <Typography.Text strong>Sensitive Information</Typography.Text>
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Encrypted at rest. Only accessible to authorized users.
                </Typography.Text>
              </div>

              <Form.Item name="taxId" label="Tax ID (CPF/CNPJ)">
                <Input placeholder="123.456.789-00" />
              </Form.Item>

              <Form.Item name="dateOfBirth" label="Date of Birth">
                <Input placeholder="YYYY-MM-DD" />
              </Form.Item>

              <Form.Item name="address" label="Address">
                <Input.TextArea rows={2} placeholder="Full address" />
              </Form.Item>

              <Form.Item name="bankDetails" label="Bank Details">
                <Input.TextArea rows={2} placeholder="Bank account information" />
              </Form.Item>
            </>
          )}

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button onClick={() => navigate('/customers')}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Create Customer
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

// ─── View / Edit Mode ────────────────────────────────────────────────────────

function ViewCustomerPage({ mnemonic }: { mnemonic: string }) {
  const navigate = useNavigate();

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customers', 'mnemonic', mnemonic],
    queryFn: () => customersApi.getByMnemonic(mnemonic),
  });

  if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;

  if (error || !customer) {
    return (
      <Result
        status="404"
        title="Customer not found"
        subTitle={`No customer found with mnemonic "${mnemonic}"`}
        extra={
          <Button type="primary" onClick={() => navigate('/customers')}>
            Back to Customers
          </Button>
        }
      />
    );
  }

  const c = customer as Customer & CustomerWithSensitive;

  return (
    <div>
      {/* Page Header */}
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={() => navigate('/customers')}
        style={{ marginBottom: 16 }}
      >
        Back to Customers
      </Button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {c.fullName}
        </Typography.Title>
        <Tag style={{ fontFamily: 'monospace' }}>{c.mnemonic}</Tag>
        {c.riskProfile && (
          <Tag color={riskColor[c.riskProfile as keyof typeof riskColor]}>{c.riskProfile}</Tag>
        )}
      </div>

      {/* Section 1: Basic Information */}
      <BasicInfoSection customer={c} />

      {/* Section 2: Sensitive Information */}
      <SensitiveInfoSection customer={c} />

      {/* Section 3: Notes & Files */}
      <NotesFilesTimeline customerId={c.id} />

      {/* Section 4: Communication History */}
      <CommunicationsTimeline customerId={c.id} />

      {/* Section 5: Access Roles */}
      <AccessRolesSection customer={c} />
    </div>
  );
}

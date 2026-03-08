import { useEffect } from 'react';
import { Drawer, Form, Input, Select, Button, Space, App } from 'antd';
import { useMutation } from '@tanstack/react-query';
import type { Customer, CreateCustomerDto } from '@investor-backoffice/shared';
import { PERMISSIONS } from '@investor-backoffice/shared';
import { customersApi } from '../../api/customers.api.js';
import { useAuthStore } from '../../store/auth.store.js';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer?: Customer; // if provided, edit mode
}

export function CustomerFormDrawer({ open, onClose, onSuccess, customer }: Props) {
  const [form] = Form.useForm<CreateCustomerDto>();
  const { hasPermission } = useAuthStore();
  const { message } = App.useApp();
  const canWriteSensitive = hasPermission(PERMISSIONS.CUSTOMERS_WRITE_SENSITIVE);
  const isEdit = !!customer;

  useEffect(() => {
    if (open && customer) {
      form.setFieldsValue(customer);
    } else if (!open) {
      form.resetFields();
    }
  }, [open, customer, form]);

  const createMutation = useMutation({
    mutationFn: (dto: CreateCustomerDto) => customersApi.create(dto),
    onSuccess: () => {
      message.success('Customer created');
      onSuccess();
    },
    onError: () => message.error('Failed to create customer'),
  });

  const updateMutation = useMutation({
    mutationFn: (dto: CreateCustomerDto) => customersApi.update(customer!.id, dto),
    onSuccess: () => {
      message.success('Customer updated');
      onSuccess();
    },
    onError: () => message.error('Failed to update customer'),
  });

  const handleFinish = (values: CreateCustomerDto) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Drawer
      title={isEdit ? `Edit ${customer?.mnemonic}` : 'New Customer'}
      open={open}
      onClose={onClose}
      width={480}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={isPending} onClick={() => form.submit()}>
            {isEdit ? 'Save Changes' : 'Create Customer'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="mnemonic" label="Mnemonic ID (leave blank to auto-generate)">
          <Input placeholder="e.g. SILVA001" maxLength={12} style={{ textTransform: 'uppercase' }} />
        </Form.Item>

        <Form.Item
          name="fullName"
          label="Full Name"
          rules={[{ required: true, message: 'Full name is required' }]}
        >
          <Input placeholder="Customer full name" />
        </Form.Item>

        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Invalid email' }]}>
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
            <Form.Item
              style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}
            >
              <strong>Sensitive Information</strong>
              <br />
              <small style={{ color: '#999' }}>
                These fields are encrypted at rest. Only authorized users can view them.
              </small>
            </Form.Item>

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
      </Form>
    </Drawer>
  );
}

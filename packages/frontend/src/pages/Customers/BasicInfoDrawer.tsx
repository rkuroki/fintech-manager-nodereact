import { useEffect } from 'react';
import { Drawer, Form, Input, Select, Button, Space, App } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Customer, UpdateCustomerDto } from '@investor-backoffice/shared';
import { customersApi } from '../../api/customers.api.js';

interface Props {
  open: boolean;
  onClose: () => void;
  customer: Customer;
}

export function BasicInfoDrawer({ open, onClose, customer }: Props) {
  const [form] = Form.useForm<UpdateCustomerDto>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        fullName: customer.fullName,
        email: customer.email ?? undefined,
        phone: customer.phone ?? undefined,
        riskProfile: customer.riskProfile ?? undefined,
        investorNotes: customer.investorNotes ?? undefined,
      });
    } else {
      form.resetFields();
    }
  }, [open, customer, form]);

  const mutation = useMutation({
    mutationFn: (dto: UpdateCustomerDto) => customersApi.update(customer.id, dto),
    onSuccess: () => {
      message.success('Basic info updated');
      queryClient.invalidateQueries({ queryKey: ['customers', 'mnemonic', customer.mnemonic] });
      onClose();
    },
    onError: () => message.error('Failed to update customer'),
  });

  return (
    <Drawer
      title="Edit Basic Information"
      open={open}
      onClose={onClose}
      width={480}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={mutation.isPending} onClick={() => form.submit()}>
            Save Changes
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={(v) => mutation.mutate(v)}>
        <Form.Item
          name="fullName"
          label="Full Name"
          rules={[{ required: true, message: 'Full name is required' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Invalid email' }]}>
          <Input />
        </Form.Item>

        <Form.Item name="phone" label="Phone">
          <Input placeholder="+55 11 99999-9999" />
        </Form.Item>

        <Form.Item name="riskProfile" label="Risk Profile">
          <Select allowClear placeholder="Select risk profile">
            <Select.Option value="conservative">Conservative</Select.Option>
            <Select.Option value="moderate">Moderate</Select.Option>
            <Select.Option value="aggressive">Aggressive</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="investorNotes" label="Investor Notes">
          <Input.TextArea rows={3} placeholder="Internal notes about this customer" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

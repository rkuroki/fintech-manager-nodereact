import { useEffect } from 'react';
import { Drawer, Form, Input, Button, Space, App } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Customer, CustomerWithSensitive, UpdateCustomerDto } from '@investor-backoffice/shared';
import { customersApi } from '../../api/customers.api.js';

interface Props {
  open: boolean;
  onClose: () => void;
  customer: Customer | CustomerWithSensitive;
}

export function SensitiveInfoDrawer({ open, onClose, customer }: Props) {
  const [form] = Form.useForm<UpdateCustomerDto>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const sensitive = customer as CustomerWithSensitive;

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        taxId: sensitive.taxId ?? undefined,
        dateOfBirth: sensitive.dateOfBirth ?? undefined,
        address: sensitive.address ?? undefined,
        bankDetails: sensitive.bankDetails ?? undefined,
      });
    } else {
      form.resetFields();
    }
  }, [open, sensitive, form]);

  const mutation = useMutation({
    mutationFn: (dto: UpdateCustomerDto) => customersApi.update(customer.id, dto),
    onSuccess: () => {
      message.success('Sensitive info updated');
      queryClient.invalidateQueries({ queryKey: ['customers', 'mnemonic', customer.mnemonic] });
      onClose();
    },
    onError: () => message.error('Failed to update sensitive information'),
  });

  return (
    <Drawer
      title="Edit Sensitive Information"
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
      <p style={{ color: '#888', marginBottom: 16, fontSize: 13 }}>
        These fields are encrypted at rest and only accessible to authorized users.
      </p>
      <Form form={form} layout="vertical" onFinish={(v) => mutation.mutate(v)}>
        <Form.Item name="taxId" label="Tax ID (CPF/CNPJ)">
          <Input placeholder="123.456.789-00" />
        </Form.Item>

        <Form.Item name="dateOfBirth" label="Date of Birth">
          <Input placeholder="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item name="address" label="Address">
          <Input.TextArea rows={3} placeholder="Full address" />
        </Form.Item>

        <Form.Item name="bankDetails" label="Bank Details">
          <Input.TextArea rows={3} placeholder="Bank account information" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

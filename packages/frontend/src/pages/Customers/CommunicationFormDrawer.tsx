import { useEffect } from 'react';
import { Drawer, Form, Input, Select, Button, Space, App } from 'antd';
import { DatePicker } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { CommunicationRecord, CreateCommunicationDto } from '@investor-backoffice/shared';
import { customersApi } from '../../api/customers.api.js';

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  communication?: CommunicationRecord;
}

export function CommunicationFormDrawer({ open, onClose, customerId, communication }: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const isEdit = !!communication;

  useEffect(() => {
    if (open && communication) {
      form.setFieldsValue({
        channel: communication.channel,
        summary: communication.summary,
        occurredAt: dayjs(communication.occurredAt),
      });
    } else if (open) {
      form.setFieldsValue({ occurredAt: dayjs() });
    } else {
      form.resetFields();
    }
  }, [open, communication, form]);

  const createMutation = useMutation({
    mutationFn: (dto: CreateCommunicationDto) =>
      customersApi.createCommunication(customerId, dto),
    onSuccess: () => {
      message.success('Communication recorded');
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'communications'] });
      onClose();
    },
    onError: () => message.error('Failed to record communication'),
  });

  const updateMutation = useMutation({
    mutationFn: (dto: CreateCommunicationDto) =>
      customersApi.updateCommunication(customerId, communication!.id, dto),
    onSuccess: () => {
      message.success('Communication updated');
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'communications'] });
      onClose();
    },
    onError: () => message.error('Failed to update communication'),
  });

  const handleFinish = (values: {
    channel: CommunicationRecord['channel'];
    summary: string;
    occurredAt: dayjs.Dayjs;
  }) => {
    const dto: CreateCommunicationDto = {
      channel: values.channel,
      summary: values.summary,
      occurredAt: values.occurredAt.toISOString(),
    };
    if (isEdit) updateMutation.mutate(dto);
    else createMutation.mutate(dto);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Drawer
      title={isEdit ? 'Edit Communication' : 'Add Communication'}
      open={open}
      onClose={onClose}
      width={480}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={isPending} onClick={() => form.submit()}>
            {isEdit ? 'Save Changes' : 'Add'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="channel"
          label="Channel"
          rules={[{ required: true, message: 'Channel is required' }]}
        >
          <Select placeholder="Select channel">
            <Select.Option value="email">Email</Select.Option>
            <Select.Option value="phone">Phone</Select.Option>
            <Select.Option value="whatsapp">WhatsApp</Select.Option>
            <Select.Option value="meeting">Meeting</Select.Option>
            <Select.Option value="other">Other</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="occurredAt"
          label="Date & Time"
          rules={[{ required: true, message: 'Date is required' }]}
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="summary"
          label="Summary"
          rules={[{ required: true, message: 'Summary is required' }]}
        >
          <Input.TextArea
            rows={5}
            placeholder="Describe what was discussed..."
            maxLength={5000}
            showCount
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

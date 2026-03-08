import { useEffect } from 'react';
import { Drawer, Form, Input, Switch, Button, Space, App } from 'antd';
import { useMutation } from '@tanstack/react-query';
import type { User, CreateUserDto, UpdateUserDto } from '@investor-backoffice/shared';
import { usersApi } from '../../api/users.api.js';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: User;
}

export function UserFormDrawer({ open, onClose, onSuccess, user }: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const isEdit = !!user;

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({ ...user, password: undefined });
    } else if (!open) {
      form.resetFields();
    }
  }, [open, user, form]);

  const createMutation = useMutation({
    mutationFn: (dto: CreateUserDto) => usersApi.create(dto),
    onSuccess: () => { message.success('User created'); onSuccess(); },
    onError: () => message.error('Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateUserDto) => usersApi.update(user!.id, dto),
    onSuccess: () => { message.success('User updated'); onSuccess(); },
    onError: () => message.error('Failed to update user'),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleFinish = (values: CreateUserDto & UpdateUserDto) => {
    if (isEdit) {
      const { password: _p, ...rest } = values;
      updateMutation.mutate(rest);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <Drawer
      title={isEdit ? `Edit @${user?.alias}` : 'New User'}
      open={open}
      onClose={onClose}
      width={440}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={isPending} onClick={() => form.submit()}>
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
          <Input placeholder="John Doe" />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
          <Input placeholder="user@example.com" />
        </Form.Item>
        <Form.Item name="alias" label="Alias" rules={[{ required: true }]}>
          <Input placeholder="john.doe" prefix="@" />
        </Form.Item>
        {!isEdit && (
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
            <Input.Password placeholder="Minimum 8 characters" />
          </Form.Item>
        )}
        <Form.Item name="mobileNumber" label="Mobile Number">
          <Input placeholder="+55 11 99999-9999" />
        </Form.Item>
        <Form.Item name="identityId" label="CPF">
          <Input placeholder="123.456.789-00" />
        </Form.Item>
        <Form.Item name="isAdmin" label="Admin Access" valuePropName="checked">
          <Switch />
        </Form.Item>
        {isEdit && (
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Drawer>
  );
}

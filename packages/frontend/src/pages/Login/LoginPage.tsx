import { Form, Input, Button, Card, Typography, App } from 'antd';
import { MailOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/auth.api.js';
import { useAuthStore } from '../../store/auth.store.js';
import type { LoginDto } from '@investor-backoffice/shared';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { message } = App.useApp();

  const mutation = useMutation({
    mutationFn: (dto: LoginDto) => authApi.login(dto.email, dto.password),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      message.success(`Welcome back, ${data.user.fullName}!`);
      navigate('/dashboard', { replace: true });
    },
    onError: () => {
      message.error('Invalid email or password');
    },
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <SafetyOutlined style={{ fontSize: 40, color: '#1677ff' }} />
          <Typography.Title level={3} style={{ marginTop: 8, marginBottom: 4 }}>
            Investor Backoffice
          </Typography.Title>
          <Typography.Text type="secondary">Sign in to your account</Typography.Text>
        </div>

        <Form
          layout="vertical"
          onFinish={(values: LoginDto) => mutation.mutate(values)}
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="your@email.com"
              size="large"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={mutation.isPending}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

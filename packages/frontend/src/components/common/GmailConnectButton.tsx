import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Space, Tag, Popconfirm, message, Tooltip } from 'antd';
import { GoogleOutlined, DisconnectOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { PERMISSIONS } from '@investor-backoffice/shared';
import { gmailApi } from '../../api/gmail.api.js';
import { useAuthStore } from '../../store/auth.store.js';

/**
 * Button that shows Gmail connection status and allows connect/disconnect.
 * Only visible to users with GMAIL_CONNECT permission.
 * Gracefully hidden when Gmail integration is not configured on the server.
 */
export function GmailConnectButton() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [disconnecting, setDisconnecting] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['gmail', 'status'],
    queryFn: () => gmailApi.getStatus(),
    enabled: hasPermission(PERMISSIONS.GMAIL_CONNECT),
    retry: false,
  });

  // Don't render if user lacks permission or Gmail not configured
  if (!hasPermission(PERMISSIONS.GMAIL_CONNECT)) return null;
  if (isLoading) return null;
  if (!status?.configured) return null;

  const handleConnect = async () => {
    try {
      const { authUrl } = await gmailApi.getAuthUrl();
      // Open Google consent in a new tab
      window.open(authUrl, '_blank', 'noopener,noreferrer');
    } catch {
      message.error('Failed to start Gmail connection');
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await gmailApi.disconnect();
      queryClient.invalidateQueries({ queryKey: ['gmail'] });
      message.success('Gmail disconnected');
    } catch {
      message.error('Failed to disconnect Gmail');
    } finally {
      setDisconnecting(false);
    }
  };

  if (status.connected) {
    return (
      <Space>
        <Tag icon={<CheckCircleOutlined />} color="success">
          Gmail: {status.email}
        </Tag>
        <Popconfirm
          title="Disconnect Gmail?"
          description="Cached emails will be removed. You can reconnect later."
          onConfirm={handleDisconnect}
          okText="Disconnect"
          cancelText="Cancel"
        >
          <Tooltip title="Disconnect Gmail">
            <Button
              size="small"
              danger
              icon={<DisconnectOutlined />}
              loading={disconnecting}
            />
          </Tooltip>
        </Popconfirm>
      </Space>
    );
  }

  return (
    <Button
      icon={<GoogleOutlined />}
      onClick={handleConnect}
      size="small"
    >
      Connect Gmail
    </Button>
  );
}

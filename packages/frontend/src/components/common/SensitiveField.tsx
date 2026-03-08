import { useState } from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, LockOutlined } from '@ant-design/icons';

interface Props {
  value: string | null | undefined;
  /** Whether the current user has permission to see this field */
  visible: boolean;
  label?: string;
}

/**
 * Renders a sensitive field value.
 * - If not visible (no permission): shows a lock icon with "Restricted"
 * - If visible but not revealed: shows masked dots with a reveal button
 * - If revealed: shows plaintext with a hide button
 */
export function SensitiveField({ value, visible, label }: Props) {
  const [revealed, setRevealed] = useState(false);

  if (!visible) {
    return (
      <Tooltip title="You don't have permission to view this field">
        <Typography.Text type="secondary">
          <LockOutlined /> Restricted
        </Typography.Text>
      </Tooltip>
    );
  }

  if (!value) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }

  return (
    <span>
      <Typography.Text code={revealed} style={{ marginRight: 4 }}>
        {revealed ? value : '••••••••'}
      </Typography.Text>
      <Tooltip title={revealed ? `Hide ${label ?? 'field'}` : `Reveal ${label ?? 'field'}`}>
        <Button
          type="link"
          size="small"
          icon={revealed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={() => setRevealed((r) => !r)}
          style={{ padding: 0 }}
        />
      </Tooltip>
    </span>
  );
}

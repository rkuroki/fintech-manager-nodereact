import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface ConfirmOptions {
  title: string;
  content?: string;
  onConfirm: () => void | Promise<void>;
  danger?: boolean;
}

/**
 * Shows an Ant Design confirmation modal.
 * Call this function directly (no JSX needed).
 */
export function confirm({ title, content, onConfirm, danger = false }: ConfirmOptions) {
  Modal.confirm({
    title,
    content,
    icon: <ExclamationCircleOutlined />,
    okText: 'Confirm',
    okType: danger ? 'danger' : 'primary',
    cancelText: 'Cancel',
    onOk: onConfirm,
  });
}

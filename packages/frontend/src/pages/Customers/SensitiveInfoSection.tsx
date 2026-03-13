import { useState } from 'react';
import { Card, Descriptions, Button, Alert } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import type { Customer, CustomerWithSensitive } from '@investor-backoffice/shared';
import { PERMISSIONS } from '@investor-backoffice/shared';
import { useAuthStore } from '../../store/auth.store.js';
import { SensitiveField } from '../../components/common/SensitiveField.js';
import { SensitiveInfoDrawer } from './SensitiveInfoDrawer.js';

interface Props {
  customer: Customer | CustomerWithSensitive;
}

export function SensitiveInfoSection({ customer }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { hasPermission } = useAuthStore();
  const canRead = hasPermission(PERMISSIONS.CUSTOMERS_READ_SENSITIVE);
  const canEdit = hasPermission(PERMISSIONS.CUSTOMERS_WRITE_SENSITIVE);

  if (!canRead) {
    return (
      <Card
        title={
          <span>
            <LockOutlined style={{ marginRight: 8 }} />
            Sensitive Information
          </span>
        }
        style={{ marginBottom: 24 }}
      >
        <Alert
          type="warning"
          message="You don't have permission to view sensitive customer data."
          showIcon
        />
      </Card>
    );
  }

  const s = customer as CustomerWithSensitive;

  return (
    <>
      <Card
        title={
          <span>
            <LockOutlined style={{ marginRight: 8 }} />
            Sensitive Information
          </span>
        }
        style={{ marginBottom: 24 }}
        extra={
          canEdit && (
            <Button icon={<EditOutlined />} onClick={() => setDrawerOpen(true)}>
              Edit
            </Button>
          )
        }
      >
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="Tax ID (CPF/CNPJ)" span={2}>
            <SensitiveField value={s.taxId} visible={true} label="Tax ID" />
          </Descriptions.Item>
          <Descriptions.Item label="Date of Birth">
            <SensitiveField value={s.dateOfBirth} visible={true} label="Date of Birth" />
          </Descriptions.Item>
          <Descriptions.Item label="Address">
            <SensitiveField value={s.address} visible={true} label="Address" />
          </Descriptions.Item>
          <Descriptions.Item label="Bank Details" span={2}>
            <SensitiveField value={s.bankDetails} visible={true} label="Bank Details" />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <SensitiveInfoDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        customer={customer}
      />
    </>
  );
}

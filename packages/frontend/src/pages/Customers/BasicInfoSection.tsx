import { useState } from 'react';
import { Card, Descriptions, Tag, Button, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { Customer } from '@investor-backoffice/shared';
import { PERMISSIONS } from '@investor-backoffice/shared';
import { useAuthStore } from '../../store/auth.store.js';
import { BasicInfoDrawer } from './BasicInfoDrawer.js';

const riskColor = { conservative: 'blue', moderate: 'orange', aggressive: 'red' } as const;

interface Props {
  customer: Customer;
}

export function BasicInfoSection({ customer }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { hasPermission } = useAuthStore();
  const canEdit = hasPermission(PERMISSIONS.CUSTOMERS_UPDATE);

  return (
    <>
      <Card
        title="Basic Information"
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
          <Descriptions.Item label="Full Name">{customer.fullName}</Descriptions.Item>
          <Descriptions.Item label="Mnemonic">
            <Typography.Text code>{customer.mnemonic}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Email">{customer.email ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Phone">{customer.phone ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Risk Profile">
            {customer.riskProfile ? (
              <Tag color={riskColor[customer.riskProfile]}>{customer.riskProfile}</Tag>
            ) : (
              '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Created At">
            {new Date(customer.createdAt).toLocaleString()}
          </Descriptions.Item>
          {customer.investorNotes && (
            <Descriptions.Item label="Investor Notes" span={2}>
              {customer.investorNotes}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <BasicInfoDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        customer={customer}
      />
    </>
  );
}

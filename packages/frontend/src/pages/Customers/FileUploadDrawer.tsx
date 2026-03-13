import { useState } from 'react';
import { Drawer, Upload, Button, Space, App, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UploadFile } from 'antd';
import { customersApi } from '../../api/customers.api.js';

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
}

export function FileUploadDrawer({ open, onClose, customerId }: Props) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (file: File) => customersApi.uploadDocument(customerId, file),
    onSuccess: () => {
      message.success('File uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'documents'] });
      setFileList([]);
      onClose();
    },
    onError: () => message.error('Failed to upload file'),
  });

  const handleUpload = () => {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      message.warning('Please select a file first');
      return;
    }
    mutation.mutate(file);
  };

  const handleClose = () => {
    setFileList([]);
    onClose();
  };

  return (
    <Drawer
      title="Upload File"
      open={open}
      onClose={handleClose}
      width={480}
      footer={
        <Space>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="primary"
            loading={mutation.isPending}
            disabled={fileList.length === 0}
            onClick={handleUpload}
          >
            Upload
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary">
        Supported: PDF, JPEG, PNG, GIF, DOC, DOCX, TXT (max 10 MB)
      </Typography.Paragraph>

      <Upload.Dragger
        fileList={fileList}
        beforeUpload={() => false}
        onChange={({ fileList: list }) => setFileList(list.slice(-1))}
        maxCount={1}
        accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt"
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag a file to upload</p>
        <p className="ant-upload-hint">Only one file at a time</p>
      </Upload.Dragger>
    </Drawer>
  );
}

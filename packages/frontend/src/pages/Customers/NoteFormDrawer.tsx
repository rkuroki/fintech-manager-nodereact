import { useEffect } from 'react';
import { Drawer, Form, Input, Button, Space, App } from 'antd';
import { DatePicker } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { CustomerNote, CreateNoteDto } from '@investor-backoffice/shared';
import { customersApi } from '../../api/customers.api.js';

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  note?: CustomerNote;
}

export function NoteFormDrawer({ open, onClose, customerId, note }: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const isEdit = !!note;

  useEffect(() => {
    if (open && note) {
      form.setFieldsValue({ content: note.content, noteDate: dayjs(note.noteDate) });
    } else if (open) {
      form.setFieldsValue({ noteDate: dayjs() });
    } else {
      form.resetFields();
    }
  }, [open, note, form]);

  const createMutation = useMutation({
    mutationFn: (dto: CreateNoteDto) => customersApi.createNote(customerId, dto),
    onSuccess: () => {
      message.success('Note added');
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'notes'] });
      onClose();
    },
    onError: () => message.error('Failed to add note'),
  });

  const updateMutation = useMutation({
    mutationFn: (dto: CreateNoteDto) => customersApi.updateNote(customerId, note!.id, dto),
    onSuccess: () => {
      message.success('Note updated');
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'notes'] });
      onClose();
    },
    onError: () => message.error('Failed to update note'),
  });

  const handleFinish = (values: { content: string; noteDate: dayjs.Dayjs }) => {
    const dto: CreateNoteDto = {
      content: values.content,
      noteDate: values.noteDate.toISOString(),
    };
    if (isEdit) updateMutation.mutate(dto);
    else createMutation.mutate(dto);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Drawer
      title={isEdit ? 'Edit Note' : 'Add Note'}
      open={open}
      onClose={onClose}
      width={480}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={isPending} onClick={() => form.submit()}>
            {isEdit ? 'Save Changes' : 'Add Note'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="noteDate"
          label="Date"
          rules={[{ required: true, message: 'Date is required' }]}
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="content"
          label="Note"
          rules={[{ required: true, message: 'Note content is required' }]}
        >
          <Input.TextArea rows={6} placeholder="Enter note content..." maxLength={10000} showCount />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

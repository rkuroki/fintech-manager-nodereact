import { useState } from 'react';
import {
  Card,
  Timeline,
  Button,
  Space,
  Typography,
  Tag,
  Empty,
  Skeleton,
  App,
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { CustomerNote, CustomerDocument } from '@investor-backoffice/shared';
import { PERMISSIONS } from '@investor-backoffice/shared';
import { customersApi } from '../../api/customers.api.js';
import { useAuthStore } from '../../store/auth.store.js';
import { NoteFormDrawer } from './NoteFormDrawer.js';
import { FileUploadDrawer } from './FileUploadDrawer.js';

type TimelineItem =
  | { kind: 'note'; date: string; data: CustomerNote }
  | { kind: 'file'; date: string; data: CustomerDocument };

interface Props {
  customerId: string;
}

export function NotesFilesTimeline({ customerId }: Props) {
  const { hasPermission } = useAuthStore();
  const { modal, message } = App.useApp();
  const queryClient = useQueryClient();

  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false);
  const [fileDrawerOpen, setFileDrawerOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CustomerNote | undefined>();

  const canReadNotes = hasPermission(PERMISSIONS.INVESTOR_PROFILES_READ);
  const canReadDocs = hasPermission(PERMISSIONS.DOCUMENTS_READ);
  const canEditNotes = hasPermission(PERMISSIONS.INVESTOR_PROFILES_UPDATE);
  const canUploadDocs = hasPermission(PERMISSIONS.DOCUMENTS_UPLOAD);
  const canDeleteDocs = hasPermission(PERMISSIONS.DOCUMENTS_DELETE);

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['customers', customerId, 'notes'],
    queryFn: () => customersApi.listNotes(customerId),
    enabled: canReadNotes,
  });

  const { data: docs = [], isLoading: docsLoading } = useQuery({
    queryKey: ['customers', customerId, 'documents'],
    queryFn: () => customersApi.listDocuments(customerId),
    enabled: canReadDocs,
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => customersApi.deleteNote(customerId, noteId),
    onSuccess: () => {
      message.success('Note deleted');
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'notes'] });
    },
    onError: () => message.error('Failed to delete note'),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => customersApi.deleteDocument(customerId, docId),
    onSuccess: () => {
      message.success('File deleted');
      queryClient.invalidateQueries({ queryKey: ['customers', customerId, 'documents'] });
    },
    onError: () => message.error('Failed to delete file'),
  });

  const handleDownload = async (doc: CustomerDocument) => {
    try {
      const blob = await customersApi.downloadDocument(customerId, doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to download file');
    }
  };

  const confirmDeleteNote = (note: CustomerNote) => {
    modal.confirm({
      title: 'Delete note?',
      content: 'This action cannot be undone.',
      okButtonProps: { danger: true },
      onOk: () => deleteNoteMutation.mutate(note.id),
    });
  };

  const confirmDeleteDoc = (doc: CustomerDocument) => {
    modal.confirm({
      title: `Delete "${doc.originalName}"?`,
      content: 'This action cannot be undone.',
      okButtonProps: { danger: true },
      onOk: () => deleteDocMutation.mutate(doc.id),
    });
  };

  // Merge notes + docs into a unified sorted timeline
  const items: TimelineItem[] = [
    ...notes.map((n): TimelineItem => ({ kind: 'note', date: n.noteDate, data: n })),
    ...docs.map((d): TimelineItem => ({ kind: 'file', date: d.uploadedAt, data: d })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isLoading = notesLoading || docsLoading;

  return (
    <>
      <Card
        title="Notes & Files"
        style={{ marginBottom: 24 }}
        extra={
          <Space>
            {canEditNotes && (
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={() => { setEditingNote(undefined); setNoteDrawerOpen(true); }}
              >
                Add Note
              </Button>
            )}
            {canUploadDocs && (
              <Button
                size="small"
                icon={<UploadOutlined />}
                onClick={() => setFileDrawerOpen(true)}
              >
                Upload File
              </Button>
            )}
          </Space>
        }
      >
        {isLoading ? (
          <Skeleton active />
        ) : items.length === 0 ? (
          <Empty description="No notes or files yet" />
        ) : (
          <Timeline
            items={items.map((item) =>
              item.kind === 'note'
                ? {
                    key: `note-${item.data.id}`,
                    dot: <FileTextOutlined style={{ color: '#1677ff' }} />,
                    children: (
                      <div>
                        <Space size="small" style={{ marginBottom: 4 }}>
                          <Tag color="blue">Note</Tag>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(item.data.noteDate).format('MMM D, YYYY HH:mm')}
                          </Typography.Text>
                        </Space>
                        <Typography.Paragraph
                          style={{ marginBottom: 4, whiteSpace: 'pre-wrap' }}
                        >
                          {item.data.content}
                        </Typography.Paragraph>
                        {canEditNotes && (
                          <Space size="small">
                            <Button
                              type="link"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => {
                                setEditingNote(item.data as CustomerNote);
                                setNoteDrawerOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => confirmDeleteNote(item.data as CustomerNote)}
                            >
                              Delete
                            </Button>
                          </Space>
                        )}
                      </div>
                    ),
                  }
                : {
                    key: `doc-${item.data.id}`,
                    dot: <PaperClipOutlined style={{ color: '#52c41a' }} />,
                    children: (
                      <div>
                        <Space size="small" style={{ marginBottom: 4 }}>
                          <Tag color="green">File</Tag>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(item.data.uploadedAt).format('MMM D, YYYY HH:mm')}
                          </Typography.Text>
                        </Space>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
                          {(item.data as CustomerDocument).originalName}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {(Number((item.data as CustomerDocument).sizeBytes) / 1024).toFixed(1)} KB
                        </Typography.Text>
                        <br />
                        <Space size="small" style={{ marginTop: 4 }}>
                          {canReadDocs && (
                            <Button
                              type="link"
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => handleDownload(item.data as CustomerDocument)}
                            >
                              Download
                            </Button>
                          )}
                          {canDeleteDocs && (
                            <Button
                              type="link"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => confirmDeleteDoc(item.data as CustomerDocument)}
                            >
                              Delete
                            </Button>
                          )}
                        </Space>
                      </div>
                    ),
                  }
            )}
          />
        )}
      </Card>

      <NoteFormDrawer
        open={noteDrawerOpen}
        onClose={() => { setNoteDrawerOpen(false); setEditingNote(undefined); }}
        customerId={customerId}
        {...(editingNote ? { note: editingNote } : {})}
      />

      <FileUploadDrawer
        open={fileDrawerOpen}
        onClose={() => setFileDrawerOpen(false)}
        customerId={customerId}
      />
    </>
  );
}

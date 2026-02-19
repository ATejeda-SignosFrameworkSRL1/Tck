import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Edit2,
  Save,
  ArrowRightLeft,
  ExternalLink,
  Building2,
  FolderKanban,
  Calendar,
  User,
  Clock,
  Trash2,
  Plus,
  Upload,
  Tag,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { TicketChecklistItem, TicketAttachment } from '../../types';
import { ticketsAPI, commentsAPI, trackingAPI, departmentsAPI, tagsAPI } from '../../services/api';
import { notify } from '../../store/notificationStore';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Button,
  Badge,
  StatusBadge,
  PriorityBadge,
  Avatar,
  AvatarGroup,
  Select,
  Input,
  Tabs,
  TabPanel,
  Modal,
  Spinner,
  AttachmentCard,
} from '../ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ===================== INTERFACES =====================

interface Department {
  id: number;
  name: string;
}

interface TicketTransition {
  id: number;
  fromDepartment: { id: number; name: string };
  toDepartment: { id: number; name: string };
  movedByUser: { id: number; name: string };
  note?: string;
  movedAt: string;
}

interface TicketData {
  id: number;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'blocked' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  dueDate?: string;
  project?: { id: number; name: string };
  originDepartment?: { id: number; name: string };
  currentDepartment?: { id: number; name: string };
  targetDepartment?: { id: number; name: string };
  currentDepartmentId?: number;
  createdBy?: { id: number; name: string; email: string };
  assignments?: { user: { id: number; name: string; email: string }; role?: 'assignee' | 'observer' | 'responsible' }[];
  transitions?: TicketTransition[];
  checklistItems?: TicketChecklistItem[];
  attachments?: TicketAttachment[];
  ticketTags?: { id: number; tagId: number; tag: { id: number; name: string; color: string; icon?: string | null } }[];
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: { id: number; name: string };
}

interface TimeEntry {
  id: number;
  hoursSpent: number;
  description?: string;
  loggedAt: string;
  user: { id: number; name: string };
}

// ===================== PROPS =====================

export type TicketDetailVariant = 'drawer' | 'modal';

interface TicketDetailDrawerProps {
  ticketId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onTicketUpdated?: () => void;
  /** Si es 'modal', se muestra como modal centrado; si es 'drawer', panel lateral (por defecto) */
  variant?: TicketDetailVariant;
  /** Estado de navegación para que "abrir en página completa" sepa volver al origen */
  returnState?: Record<string, unknown>;
}

// ===================== COMPONENT =====================

const TicketDetailDrawer: React.FC<TicketDetailDrawerProps> = ({
  ticketId,
  isOpen,
  onClose,
  onTicketUpdated,
  variant = 'drawer',
  returnState,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI
  const [activeTab, setActiveTab] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', priority: '' });

  // Move modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveForm, setMoveForm] = useState({ toDepartmentId: '', note: '' });
  const [isMoving, setIsMoving] = useState(false);

  // Delete ticket modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);

  // Comments
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  // Time tracking
  const [timeForm, setTimeForm] = useState({ hours: '', description: '' });
  const [isSubmittingTime, setIsSubmittingTime] = useState(false);

  // Checklist & attachments
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isAddingChecklistItem, setIsAddingChecklistItem] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<number | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null);
  const [imageExpanded, setImageExpanded] = useState(false);

  // Tags
  const [allTags, setAllTags] = useState<{ id: number; name: string; color: string; icon?: string | null }[]>([]);
  const [addingTagId, setAddingTagId] = useState<number | null>(null);
  const [removingTagId, setRemovingTagId] = useState<number | null>(null);

  // ===================== EFFECTS =====================

  useEffect(() => {
    if (ticketId && isOpen) {
      setIsLoading(true);
      setActiveTab('details');
      setIsEditing(false);
      setNewComment('');
      setNewChecklistText('');
      setNewAttachmentFiles([]);
      setTimeForm({ hours: '', description: '' });
      loadTicket(ticketId);
      loadDepartments();
      loadAllTags();
    }
  }, [ticketId, isOpen]);

  const loadAllTags = async () => {
    try {
      const res = await tagsAPI.getAll();
      setAllTags(res.data);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const closeImagePreview = useCallback(() => {
    setImageExpanded(false);
    setImagePreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.url);
        return null;
      }
      return prev;
    });
  }, []);

  // Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (imagePreview) closeImagePreview();
      else if (!showMoveModal && !showDeleteModal) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, showMoveModal, showDeleteModal, imagePreview, closeImagePreview]);

  // ===================== LOADERS =====================

  const loadDepartments = async () => {
    try {
      const res = await departmentsAPI.getAll();
      setDepartments(res.data);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadTicket = async (id: number) => {
    try {
      setIsLoading(true);
      const [ticketRes, commentsRes, timeRes] = await Promise.all([
        ticketsAPI.getOne(id),
        commentsAPI.getByTicket(id),
        trackingAPI.getTime(id),
      ]);
      setTicket(ticketRes.data);
      setComments(commentsRes.data || []);
      setTimeEntries(timeRes.data || []);
      setEditForm({
        status: ticketRes.data.status,
        priority: ticketRes.data.priority,
      });
    } catch (error) {
      console.error('Error loading ticket:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ===================== HANDLERS =====================

  const handleSaveEdit = async () => {
    if (!ticket) return;
    try {
      await ticketsAPI.update(ticket.id, {
        status: editForm.status as any,
        priority: editForm.priority as any,
      });
      loadTicket(ticket.id);
      setIsEditing(false);
      onTicketUpdated?.();
      notify({ type: 'success', title: 'Ticket actualizado', entityType: 'ticket', entityId: ticket.id });
    } catch (error: any) {
      notify({ type: 'error', title: 'Error al actualizar', body: error.response?.data?.message, entityType: 'ticket', entityId: ticket.id });
    }
  };

  const handleMoveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !moveForm.toDepartmentId) return;
    try {
      setIsMoving(true);
      await ticketsAPI.move(ticket.id, {
        toDepartmentId: parseInt(moveForm.toDepartmentId),
        note: moveForm.note || undefined,
      });
      setShowMoveModal(false);
      setMoveForm({ toDepartmentId: '', note: '' });
      loadTicket(ticket.id);
      onTicketUpdated?.();
      notify({ type: 'movement', title: 'Ticket movido', entityType: 'ticket', entityId: ticket.id });
    } catch (error: any) {
      notify({ type: 'error', title: 'Error al mover ticket', body: error.response?.data?.message, entityType: 'ticket', entityId: ticket.id });
    } finally {
      setIsMoving(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticket) return;
    try {
      setIsDeletingTicket(true);
      await ticketsAPI.delete(ticket.id);
      setShowDeleteModal(false);
      onTicketUpdated?.();
      onClose();
    } catch (error: any) {
      notify({ type: 'error', title: 'Error al eliminar el ticket', body: error.response?.data?.message, entityType: 'ticket', entityId: ticket.id });
    } finally {
      setIsDeletingTicket(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !ticket) return;
    try {
      setIsSubmittingComment(true);
      await commentsAPI.create(ticket.id, newComment);
      const userName = user?.name || 'Usuario';
      notify({
        type: 'comment',
        title: `${userName} agregó un comentario en ticket #${ticket.id}`,
        link: `/tickets/${ticket.id}`,
        entityType: 'ticket',
        entityId: ticket.id,
      });
      setNewComment('');
      loadTicket(ticket.id);
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleUpdateComment = async (commentId: number) => {
    if (!ticket || !editingCommentText.trim()) return;
    try {
      await commentsAPI.update(ticket.id, commentId, editingCommentText.trim());
      const userName = user?.name || 'Usuario';
      notify({
        type: 'comment',
        title: `${userName} editó un comentario en ticket #${ticket.id}`,
        link: `/tickets/${ticket.id}`,
        entityType: 'ticket',
        entityId: ticket.id,
      });
      setEditingCommentId(null);
      setEditingCommentText('');
      loadTicket(ticket.id);
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!ticket) return;
    if (!window.confirm('¿Eliminar este comentario?')) return;
    try {
      setDeletingCommentId(commentId);
      await commentsAPI.delete(ticket.id, commentId);
      const userName = user?.name || 'Usuario';
      notify({
        type: 'comment',
        title: `${userName} eliminó un comentario en ticket #${ticket.id}`,
        link: `/tickets/${ticket.id}`,
        entityType: 'ticket',
        entityId: ticket.id,
      });
      loadTicket(ticket.id);
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleAddTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeForm.hours || !ticket) return;
    try {
      setIsSubmittingTime(true);
      await trackingAPI.logTime(ticket.id, {
        hoursSpent: parseFloat(timeForm.hours),
        description: timeForm.description || undefined,
      });
      setTimeForm({ hours: '', description: '' });
      loadTicket(ticket.id);
    } catch (error) {
      console.error('Error logging time:', error);
    } finally {
      setIsSubmittingTime(false);
    }
  };

  const handleOpenFullPage = () => {
    onClose();
    navigate(`/tickets/${ticketId}`, { state: returnState });
  };

  const handleToggleChecklistItem = async (item: TicketChecklistItem) => {
    if (!ticket) return;
    try {
      setTogglingItemId(item.id);
      await ticketsAPI.updateChecklistItem(ticket.id, item.id, { isCompleted: !item.isCompleted });
      loadTicket(ticket.id);
    } catch (error) {
      console.error('Error updating checklist item:', error);
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim() || !ticket) return;
    try {
      setIsAddingChecklistItem(true);
      await ticketsAPI.addChecklistItem(ticket.id, { text: newChecklistText.trim() });
      setNewChecklistText('');
      loadTicket(ticket.id);
    } catch (error) {
      console.error('Error adding checklist item:', error);
    } finally {
      setIsAddingChecklistItem(false);
    }
  };

  const handleDeleteChecklistItem = async (itemId: number) => {
    if (!ticket) return;
    try {
      await ticketsAPI.deleteChecklistItem(ticket.id, itemId);
      loadTicket(ticket.id);
    } catch (error) {
      console.error('Error deleting checklist item:', error);
    }
  };

  const handleDownloadAttachment = async (att: TicketAttachment) => {
    if (!ticket) return;
    try {
      setDownloadingAttachmentId(att.id);
      const res = await ticketsAPI.downloadAttachment(ticket.id, att.id);
      const blob = new Blob([res.data], { type: att.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.originalName || att.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const handleViewAttachment = async (att: TicketAttachment) => {
    if (!ticket) return;
    try {
      const res = await ticketsAPI.downloadAttachment(ticket.id, att.id);
      const blob = new Blob([res.data], { type: att.mimeType });
      const url = URL.createObjectURL(blob);
      const isImage = att.mimeType.startsWith('image/');
      if (isImage) {
        setImagePreview({ url, name: att.originalName });
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error viewing attachment:', error);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!ticket) return;
    if (!window.confirm('¿Eliminar este adjunto?')) return;
    try {
      await ticketsAPI.deleteAttachment(ticket.id, attachmentId);
      loadTicket(ticket.id);
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  const handleAttachmentFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) setNewAttachmentFiles(Array.from(files));
    e.target.value = '';
  };

  const handleUploadAttachments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || newAttachmentFiles.length === 0) return;
    try {
      setIsUploadingAttachments(true);
      await ticketsAPI.uploadAttachments(ticket.id, newAttachmentFiles);
      setNewAttachmentFiles([]);
      loadTicket(ticket.id);
    } catch (error) {
      console.error('Error uploading attachments:', error);
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  const handleAddTagToTicket = async (tagId: number) => {
    if (!ticket) return;
    try {
      setAddingTagId(tagId);
      await tagsAPI.addToTicket(ticket.id, tagId);
      loadTicket(ticket.id);
      onTicketUpdated?.();
      notify({ type: 'success', title: 'Tag asignado al ticket', entityType: 'ticket', entityId: ticket.id });
    } catch (error: any) {
      notify({ type: 'error', title: 'Error al asignar tag', body: error.response?.data?.message, entityType: 'ticket', entityId: ticket.id });
    } finally {
      setAddingTagId(null);
    }
  };

  const handleRemoveTagFromTicket = async (tagId: number) => {
    if (!ticket) return;
    try {
      setRemovingTagId(tagId);
      await tagsAPI.removeFromTicket(ticket.id, tagId);
      loadTicket(ticket.id);
      onTicketUpdated?.();
    } catch (error) {
      console.error('Error al quitar tag:', error);
    } finally {
      setRemovingTagId(null);
    }
  };

  // ===================== RENDER =====================

  if (!isOpen || !ticketId) return null;

  const canEditTicket = ticket?.createdBy?.id === user?.id;
  const isResponsible = ticket?.assignments?.some((a) => a.role === 'responsible' && a.user.id === user?.id) ?? false;
  const canManageTicket = canEditTicket || isResponsible;
  // Observadores y asignados pueden comentar
  const isParticipant = ticket?.assignments?.some((a) => a.user.id === user?.id) ?? false;
  const canComment = canManageTicket || isParticipant;
  const totalHours = timeEntries.reduce((sum, t) => sum + Number(t.hoursSpent || 0), 0);

  const tabs = [
    { id: 'details', label: 'Detalles' },
    { id: 'checklist', label: 'Checklist', badge: ticket?.checklistItems?.length || 0 },
    { id: 'documents', label: 'Documentos', badge: ticket?.attachments?.length || 0 },
    { id: 'transitions', label: 'Movimientos', badge: ticket?.transitions?.length || 0 },
    { id: 'comments', label: 'Comentarios', badge: comments.length },
    { id: 'time', label: 'Tiempo', badge: timeEntries.length },
  ];

  const panelContent = isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : !ticket ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-zinc-500">Ticket no encontrado</p>
          </div>
        ) : (
          <>
            {/* ===== HEADER ===== */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-light-border dark:border-dark-border">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-zinc-500 font-mono">#{ticket.id}</span>
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white truncate">
                    {ticket.title}
                  </h2>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={handleOpenFullPage}
                    className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-light-hover dark:hover:bg-dark-hover rounded-lg transition-colors"
                    title="Abrir página completa"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Actions: solo el creador puede editar */}
              <div className="flex items-center gap-2 mt-3">
                {canEditTicket && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowMoveModal(true)}
                      leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                    >
                      Mover
                    </Button>
                    {isEditing ? (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)} leftIcon={<X className="w-3.5 h-3.5" />}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit} leftIcon={<Save className="w-3.5 h-3.5" />}>
                          Guardar
                        </Button>
                      </>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
                        Editar
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowDeleteModal(true)}
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Eliminar
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* ===== METADATA BAR ===== */}
            <div className="flex-shrink-0 px-6 py-3 border-b border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-surface">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Departamentos */}
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs text-zinc-500">Departamento</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {canEditTicket && isEditing ? (
                        <Select
                          value={editForm.status}
                          onChange={(value) => setEditForm({ ...editForm, status: value })}
                          options={[
                            { value: 'open', label: 'Abierto' },
                            { value: 'in_progress', label: 'En Progreso' },
                            { value: 'blocked', label: 'Bloqueado' },
                            { value: 'in_review', label: 'En Revisión' },
                            { value: 'done', label: 'Completado' },
                          ]}
                        />
                      ) : (
                        <>
                          <span className="text-zinc-900 dark:text-white font-medium">
                            {ticket.currentDepartment?.name || 'N/A'}
                          </span>
                          {ticket.targetDepartment && (
                            <>
                              <ArrowRightLeft className="w-3 h-3 text-zinc-400" />
                              <span className="text-zinc-600 dark:text-zinc-400">
                                {ticket.targetDepartment.name}
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Proyecto */}
                <div className="flex items-start gap-2">
                  <FolderKanban className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-zinc-500">Proyecto</span>
                    <p className="text-zinc-900 dark:text-white">{ticket.project?.name || 'N/A'}</p>
                  </div>
                </div>

                {/* Asignados / Responsable / En observación */}
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div>
                    {(() => {
                      const assignees = (ticket.assignments ?? []).filter((a) => a.role === 'assignee');
                      const responsible = (ticket.assignments ?? []).find((a) => a.role === 'responsible');
                      const observers = (ticket.assignments ?? []).filter((a) => a.role === 'observer');
                      if (assignees.length === 0 && !responsible && observers.length === 0) {
                        return (
                          <>
                            <span className="text-xs text-zinc-500">Asignados</span>
                            <p className="text-zinc-500">Sin asignar</p>
                          </>
                        );
                      }
                      return (
                        <>
                          {responsible && (
                            <div className="mt-0.5">
                              <span className="text-xs text-zinc-500">Resp. seguimiento</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Avatar name={responsible.user.name} size="xs" />
                                <span className="text-xs text-zinc-900 dark:text-white font-medium">{responsible.user.name}</span>
                              </div>
                            </div>
                          )}
                          {assignees.length > 0 && (
                            <div className={responsible ? 'mt-2' : 'mt-0.5'}>
                              <span className="text-xs text-zinc-500">Ejecutores</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <AvatarGroup users={assignees.map((a) => ({ name: a.user.name }))} max={4} size="xs" />
                              </div>
                            </div>
                          )}
                          {observers.length > 0 && (
                            <div className={(assignees.length > 0 || responsible) ? 'mt-2' : 'mt-0.5'}>
                              <span className="text-xs text-zinc-500">En observación</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <AvatarGroup users={observers.map((o) => ({ name: o.user.name }))} max={4} size="xs" />
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Fechas */}
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-zinc-500">Creado</span>
                    <p className="text-zinc-900 dark:text-white">
                      {format(new Date(ticket.createdAt), 'dd MMM yyyy', { locale: es })}
                    </p>
                    {ticket.startDate && (
                      <p className="text-xs mt-0.5 text-zinc-500">
                        Inicio: {format(new Date(ticket.startDate), 'dd MMM yyyy', { locale: es })}
                      </p>
                    )}
                    {ticket.dueDate && (
                      <p className={`text-xs mt-0.5 ${new Date(ticket.dueDate) < new Date() && ticket.status !== 'done' ? 'text-accent-danger font-medium' : 'text-zinc-500'}`}>
                        Entrega: {format(new Date(ticket.dueDate), 'dd MMM yyyy', { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="mt-3 pt-3 border-t border-light-border dark:border-dark-border">
                <div className="flex items-start gap-2">
                  <Tag className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-zinc-500 block mb-1.5">Tags</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {ticket.ticketTags?.map((tt) => (
                        <span
                          key={tt.id}
                          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: tt.tag.color }}
                        >
                          {tt.tag.name}
                          {canEditTicket && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTagFromTicket(tt.tag.id)}
                              disabled={removingTagId === tt.tag.id}
                              className="p-0.5 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
                              title="Quitar tag"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                      {canEditTicket && allTags.length > 0 && (
                        <select
                          value=""
                          onChange={(e) => {
                            const id = e.target.value ? parseInt(e.target.value, 10) : 0;
                            if (id) handleAddTagToTicket(id);
                            e.target.value = '';
                          }}
                          disabled={addingTagId !== null}
                          className="h-7 px-2 rounded border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-surface text-xs text-zinc-700 dark:text-zinc-200 min-w-[120px]"
                          title="Agregar tag"
                        >
                          <option value="">+ Agregar tag</option>
                          {allTags
                            .filter((t) => !ticket.ticketTags?.some((tt) => tt.tag.id === t.id))
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      )}
                      {(!ticket.ticketTags || ticket.ticketTags.length === 0) && (!allTags || allTags.length === 0) && (
                        <span className="text-xs text-zinc-500">Sin tags. Crea tags en el tablero (vista Lista).</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit mode: Status & Priority selectors */}
              {canEditTicket && isEditing && (
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-light-border dark:border-dark-border">
                  <Select
                    label="Estado"
                    value={editForm.status}
                    onChange={(value) => setEditForm({ ...editForm, status: value })}
                    options={[
                      { value: 'open', label: 'Abierto' },
                      { value: 'in_progress', label: 'En Progreso' },
                      { value: 'blocked', label: 'Bloqueado' },
                      { value: 'in_review', label: 'En Revisión' },
                      { value: 'done', label: 'Completado' },
                    ]}
                  />
                  <Select
                    label="Prioridad"
                    value={editForm.priority}
                    onChange={(value) => setEditForm({ ...editForm, priority: value })}
                    options={[
                      { value: 'low', label: 'Baja' },
                      { value: 'medium', label: 'Media' },
                      { value: 'high', label: 'Alta' },
                    ]}
                  />
                </div>
              )}
            </div>

            {/* ===== TABS ===== */}
            <div className="flex-shrink-0 px-6 pt-3 border-b border-light-border dark:border-dark-border">
              <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
            </div>

            {/* ===== TAB CONTENT (scrollable) ===== */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Details Tab */}
              <TabPanel tabId="details" activeTab={activeTab}>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-2">
                      {ticket.title}
                    </h3>
                    <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap text-sm leading-relaxed">
                      {ticket.description || 'Sin descripción'}
                    </p>
                  </div>

                  {/* Department flow */}
                  <div className="p-4 bg-light-bg dark:bg-dark-surface rounded-lg">
                    <h4 className="text-sm font-medium text-zinc-500 mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Flujo de Departamentos
                    </h4>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="neutral">{ticket.originDepartment?.name || 'N/A'}</Badge>
                      <ArrowRightLeft className="w-4 h-4 text-zinc-400" />
                      <Badge variant="primary">{ticket.currentDepartment?.name || 'N/A'}</Badge>
                      {ticket.targetDepartment && (
                        <>
                          <ArrowRightLeft className="w-4 h-4 text-zinc-400" />
                          <Badge variant="info">{ticket.targetDepartment.name}</Badge>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Created by */}
                  <div className="flex items-center gap-3 p-3 bg-light-bg dark:bg-dark-surface rounded-lg">
                    <Avatar name={ticket.createdBy?.name || 'Usuario'} size="sm" />
                    <div>
                      <p className="text-sm text-zinc-900 dark:text-white">{ticket.createdBy?.name}</p>
                      <p className="text-xs text-zinc-500">Creador · {ticket.createdBy?.email}</p>
                    </div>
                  </div>
                </div>
              </TabPanel>

              {/* Checklist Tab */}
              <TabPanel tabId="checklist" activeTab={activeTab}>
                <div className="space-y-4">
                  {canManageTicket && (
                    <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                      <Input
                        value={newChecklistText}
                        onChange={(e) => setNewChecklistText(e.target.value)}
                        placeholder="Nueva tarea..."
                        className="flex-1"
                      />
                      <Button type="submit" size="sm" isLoading={isAddingChecklistItem} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                        Añadir
                      </Button>
                    </form>
                  )}
                  <div className="space-y-2">
                    {(ticket.checklistItems || []).length > 0 ? (
                      (ticket.checklistItems || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-light-bg dark:bg-dark-surface rounded-lg group"
                        >
                          {canManageTicket ? (
                            <button
                              type="button"
                              onClick={() => handleToggleChecklistItem(item)}
                              disabled={togglingItemId === item.id}
                              className="flex-shrink-0 w-5 h-5 rounded border-2 border-zinc-400 dark:border-zinc-500 flex items-center justify-center hover:border-primary transition-colors disabled:opacity-50"
                            >
                              {item.isCompleted && (
                                <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
                              )}
                            </button>
                          ) : (
                            <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
                              {item.isCompleted && (
                                <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
                              )}
                            </div>
                          )}
                          <span
                            className={`flex-1 text-sm ${item.isCompleted ? 'text-zinc-500 dark:text-zinc-400 line-through' : 'text-zinc-900 dark:text-white'}`}
                          >
                            {item.text}
                          </span>
                          {canManageTicket && (
                            <button
                              type="button"
                              onClick={() => handleDeleteChecklistItem(item.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-zinc-500 py-6 text-sm">No hay ítems en el checklist</p>
                    )}
                  </div>
                </div>
              </TabPanel>

              {/* Documents Tab */}
              <TabPanel tabId="documents" activeTab={activeTab}>
                {canManageTicket && (
                  <form onSubmit={handleUploadAttachments} className="flex flex-wrap items-center justify-center gap-3 mb-4 p-3 bg-light-bg dark:bg-dark-surface rounded-lg">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={handleAttachmentFilesChange}
                      className="hidden"
                      id="ticket-drawer-add-files"
                    />
                    <label
                      htmlFor="ticket-drawer-add-files"
                      className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-light-border dark:border-dark-border rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Seleccionar archivos
                    </label>
                    {newAttachmentFiles.length > 0 && (
                      <>
                        <span className="text-xs text-zinc-500">
                          {newAttachmentFiles.length} archivo(s) seleccionado(s)
                        </span>
                        <Button type="submit" size="sm" isLoading={isUploadingAttachments} leftIcon={<Upload className="w-3.5 h-3.5" />}>
                          Subir documentos
                        </Button>
                        <button
                          type="button"
                          onClick={() => setNewAttachmentFiles([])}
                          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </form>
                )}
                <div className="space-y-2">
                  {(ticket.attachments || []).length > 0 ? (
                    (ticket.attachments || []).map((att) => (
                      <AttachmentCard
                        key={att.id}
                        fileName={att.originalName}
                        sizeBytes={att.sizeBytes}
                        uploadedByName={att.uploadedBy?.name}
                        onView={() => handleViewAttachment(att)}
                        onDownload={() => handleDownloadAttachment(att)}
                        isDownloading={downloadingAttachmentId === att.id}
                        onDelete={canManageTicket ? () => handleDeleteAttachment(att.id) : undefined}
                      />
                    ))
                  ) : (
                    <p className="text-center text-zinc-500 py-6 text-sm">No hay documentos adjuntos</p>
                  )}
                </div>
              </TabPanel>

              {/* Transitions Tab */}
              <TabPanel tabId="transitions" activeTab={activeTab}>
                <div className="space-y-3">
                  {ticket.transitions && ticket.transitions.length > 0 ? (
                    ticket.transitions.map((transition) => (
                      <div key={transition.id} className="flex gap-3 p-3 bg-light-bg dark:bg-dark-surface rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <ArrowRightLeft className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="neutral">{transition.fromDepartment.name}</Badge>
                            <ArrowRightLeft className="w-3 h-3 text-zinc-400" />
                            <Badge variant="primary">{transition.toDepartment.name}</Badge>
                          </div>
                          {transition.note && (
                            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 italic">
                              "{transition.note}"
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
                            <Avatar name={transition.movedByUser.name} size="xs" />
                            <span>{transition.movedByUser.name}</span>
                            <span>·</span>
                            <span>{format(new Date(transition.movedAt), 'dd MMM yyyy, HH:mm', { locale: es })}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-zinc-500 py-8 text-sm">
                      Este ticket no ha sido movido entre departamentos
                    </p>
                  )}
                </div>
              </TabPanel>

              {/* Comments Tab */}
              <TabPanel tabId="comments" activeTab={activeTab}>
                <div className="space-y-4">
                  {/* New comment form */}
                  {canComment && (
                    <form onSubmit={handleAddComment}>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Escribe un comentario..."
                        rows={3}
                        className="w-full px-3 py-2 bg-light-bg dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary mb-2 resize-none"
                      />
                      <Button type="submit" size="sm" isLoading={isSubmittingComment} disabled={!newComment.trim()}>
                        Agregar Comentario
                      </Button>
                    </form>
                  )}

                  {/* Comments list */}
                  <div className="space-y-3">
                    {comments.map((comment) => {
                      const canEditComment = user?.id === comment.user.id;
                      const canDeleteComment = user?.id === comment.user.id || canManageTicket;
                      const isEditing = editingCommentId === comment.id;
                      return (
                        <div key={comment.id} className="flex gap-3 p-3 bg-light-bg dark:bg-dark-surface rounded-lg">
                          <Avatar name={comment.user.name} size="sm" className="flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-zinc-900 dark:text-white">{comment.user.name}</span>
                                <span className="text-xs text-zinc-500">
                                  {format(new Date(comment.createdAt), 'dd MMM yyyy, HH:mm', { locale: es })}
                                </span>
                              </div>
                              {(canEditComment || canDeleteComment) && !isEditing && (
                                <div className="flex items-center gap-1">
                                  {canEditComment && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditingCommentText(comment.content);
                                      }}
                                      className="p-1.5 rounded-lg text-zinc-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                      title="Editar (solo propietario)"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {canDeleteComment && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(comment.id)}
                                      disabled={deletingCommentId === comment.id}
                                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                      title={user?.id === comment.user.id ? 'Eliminar' : 'Eliminar (admin del ticket)'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            {isEditing ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                  rows={3}
                                  className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleUpdateComment(comment.id)}
                                    disabled={!editingCommentText.trim()}
                                  >
                                    Guardar
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditingCommentText('');
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{comment.content}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {comments.length === 0 && (
                      <p className="text-center text-zinc-500 py-6 text-sm">No hay comentarios</p>
                    )}
                  </div>
                </div>
              </TabPanel>

              {/* Time Tab */}
              <TabPanel tabId="time" activeTab={activeTab}>
                <div className="space-y-4">
                  {/* Total */}
                  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      Total: {totalHours.toFixed(1)} horas
                    </span>
                  </div>

                  {/* Log time form */}
                  <form onSubmit={handleAddTime} className="flex gap-3">
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={timeForm.hours}
                      onChange={(e) => setTimeForm({ ...timeForm, hours: e.target.value })}
                      placeholder="Horas"
                      className="w-24"
                    />
                    <Input
                      value={timeForm.description}
                      onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })}
                      placeholder="Descripción (opcional)"
                      className="flex-1"
                    />
                    <Button type="submit" size="sm" isLoading={isSubmittingTime} disabled={!timeForm.hours}>
                      Registrar
                    </Button>
                  </form>

                  {/* Time entries */}
                  <div className="space-y-2">
                    {timeEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-light-bg dark:bg-dark-surface rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar name={entry.user.name} size="xs" />
                          <div>
                            <span className="text-sm text-zinc-900 dark:text-white">{entry.user.name}</span>
                            {entry.description && (
                              <p className="text-xs text-zinc-500">{entry.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-zinc-900 dark:text-white text-sm">{entry.hoursSpent}h</span>
                          <p className="text-xs text-zinc-500">
                            {format(new Date(entry.loggedAt), 'dd MMM', { locale: es })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {timeEntries.length === 0 && (
                      <p className="text-center text-zinc-500 py-6 text-sm">No hay tiempo registrado</p>
                    )}
                  </div>
                </div>
              </TabPanel>
            </div>
          </>
  );

  return (
    <>
      {variant === 'modal' ? (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title={ticket ? `Ticket #${ticket.id} - ${ticket.title}` : 'Ticket'}
          size="full"
          showCloseButton
        >
          <div className="min-h-[70vh] max-h-[70vh] w-full flex flex-col overflow-hidden">
            {panelContent}
          </div>
        </Modal>
      ) : (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-dark-card border-l border-light-border dark:border-dark-border shadow-2xl flex flex-col"
            style={{ animation: 'drawerSlideIn 0.25s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {panelContent}
          </div>
        </div>
      )}

      {/* Move Ticket Modal */}
      <Modal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        title="Mover Ticket a otro Departamento"
        size="sm"
      >
        <form onSubmit={handleMoveTicket} className="space-y-4">
          <p className="text-sm text-zinc-500">
            Departamento actual: <strong className="text-zinc-900 dark:text-white">{ticket?.currentDepartment?.name}</strong>
          </p>
          <Select
            label="Nuevo Departamento *"
            value={moveForm.toDepartmentId}
            onChange={(value) => setMoveForm({ ...moveForm, toDepartmentId: value })}
            options={departments
              .filter((d) => d.id !== ticket?.currentDepartmentId)
              .map((d) => ({
                value: d.id,
                label: d.name.charAt(0).toUpperCase() + d.name.slice(1),
              }))}
            placeholder="Selecciona departamento"
          />
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Nota (opcional)
            </label>
            <textarea
              value={moveForm.note}
              onChange={(e) => setMoveForm({ ...moveForm, note: e.target.value })}
              placeholder="Razón del movimiento..."
              rows={3}
              className="w-full px-3 py-2 bg-light-bg dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowMoveModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isMoving}>
              Mover Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Ticket Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar ticket"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            ¿Estás seguro de que deseas eliminar el ticket <strong className="text-zinc-900 dark:text-white">#{ticket?.id} – {ticket?.title}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeletingTicket}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteTicket} isLoading={isDeletingTicket} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
              Eliminar ticket
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Ver imagen */}
      <Modal
        isOpen={!!imagePreview}
        onClose={closeImagePreview}
        title={imagePreview?.name}
        size={imageExpanded ? 'full' : 'xl'}
        showCloseButton
        closeOnOverlay
        closeOnEscape
        headerRight={
          imagePreview ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setImageExpanded((e) => !e)}
              leftIcon={imageExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            >
              {imageExpanded ? 'Reducir' : 'Ampliar'}
            </Button>
          ) : undefined
        }
      >
        {imagePreview && (
          <div
            className={
              imageExpanded
                ? 'flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-lg min-h-[70vh] w-full p-1'
                : 'flex justify-center bg-zinc-100 dark:bg-zinc-900 rounded-lg p-2'
            }
          >
            <img
              src={imagePreview.url}
              alt={imagePreview.name}
              className={
                imageExpanded
                  ? 'w-full h-full max-h-[70vh] object-contain'
                  : 'max-w-full max-h-[70vh] object-contain'
              }
            />
          </div>
        )}
      </Modal>

      {/* Animation keyframes */}
      <style>{`
        @keyframes drawerSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default TicketDetailDrawer;

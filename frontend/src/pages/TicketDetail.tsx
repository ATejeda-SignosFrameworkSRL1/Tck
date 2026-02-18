import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit2, Save, X, Clock, User, Calendar, FolderKanban, Building2, ArrowRightLeft, History, ListTodo, Paperclip, Download, Trash2, Plus, Upload, Tag, Users, Eye, CheckCircle2, Shield, Maximize2, Minimize2 } from 'lucide-react';
import { ticketsAPI, commentsAPI, trackingAPI, departmentsAPI, tagsAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { notify } from '../store/notificationStore';
import { PageHeader, Card, CardHeader, CardTitle, Button, Badge, StatusBadge, PriorityBadge, Avatar, Select, Input, PageLoader, Tabs, TabPanel, AttachmentCard, Modal } from '../components/ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TicketChecklistItem, TicketAttachment } from '../types';

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
  status: 'open' | 'in_progress' | 'blocked' | 'done';
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

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Si venimos del Centro de Proyecto, regresar allí en vez de /tickets
  const navState = location.state as { from?: string; projectId?: number; tab?: string } | null;
  const goBack = () => {
    if (navState?.from === 'matrix' && navState.projectId) {
      navigate(`/matrix/${navState.projectId}?tab=${navState.tab || 'tickets'}`);
    } else {
      goBack();
    }
  };
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Move ticket modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveForm, setMoveForm] = useState({ toDepartmentId: '', note: '' });
  const [isMoving, setIsMoving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    status: '',
    priority: '',
  });

  // New comment
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  // Time tracking
  const [timeForm, setTimeForm] = useState({ hours: '', description: '' });
  const [isSubmittingTime, setIsSubmittingTime] = useState(false);

  // Checklist: add item
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isAddingChecklistItem, setIsAddingChecklistItem] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<number | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null);
  const [imageExpanded, setImageExpanded] = useState(false);

  const [allTags, setAllTags] = useState<{ id: number; name: string; color: string; icon?: string | null }[]>([]);
  const [addingTagId, setAddingTagId] = useState<number | null>(null);
  const [removingTagId, setRemovingTagId] = useState<number | null>(null);

  // Edit assignments modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignEditAssigneeIds, setAssignEditAssigneeIds] = useState<number[]>([]);
  const [assignEditObserverIds, setAssignEditObserverIds] = useState<number[]>([]);
  const [assignEditResponsibleId, setAssignEditResponsibleId] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  // Delete ticket modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);

  useEffect(() => {
    if (id) {
      loadTicket();
      loadDepartments();
      loadAllTags();
    }
  }, [id]);

  const loadAllTags = async () => {
    try {
      const res = await tagsAPI.getAll();
      setAllTags(res.data);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await departmentsAPI.getAll();
      setDepartments(res.data);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadTicket = async () => {
    try {
      setIsLoading(true);
      const [ticketRes, commentsRes, timeRes] = await Promise.all([
        ticketsAPI.getOne(parseInt(id!)),
        commentsAPI.getByTicket(parseInt(id!)),
        trackingAPI.getTime(parseInt(id!)),
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

  const handleSaveEdit = async () => {
    if (!ticket) return;
    try {
      await ticketsAPI.update(ticket.id, {
        status: editForm.status as any,
        priority: editForm.priority as any,
      });
      loadTicket();
      setIsEditing(false);
      if (ticket) notify({ type: 'success', title: 'Ticket actualizado', entityType: 'ticket', entityId: ticket.id });
    } catch (error: any) {
      if (ticket) notify({ type: 'error', title: 'Error al actualizar', body: error.response?.data?.message, entityType: 'ticket', entityId: ticket.id });
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
      loadTicket();
      if (ticket) notify({ type: 'movement', title: 'Ticket movido', entityType: 'ticket', entityId: ticket.id });
    } catch (error: any) {
      if (ticket) notify({ type: 'error', title: 'Error al mover ticket', body: error.response?.data?.message, entityType: 'ticket', entityId: ticket.id });
    } finally {
      setIsMoving(false);
    }
  };

  const openAssignModal = () => {
    const assignees = (ticket?.assignments ?? []).filter((a) => a.role === 'assignee');
    const observers = (ticket?.assignments ?? []).filter((a) => a.role === 'observer');
    const responsible = (ticket?.assignments ?? []).find((a) => a.role === 'responsible');
    setAssignEditAssigneeIds(assignees.map((a) => a.user.id));
    setAssignEditObserverIds(observers.map((o) => o.user.id));
    setAssignEditResponsibleId(responsible?.user.id ?? null);
    setShowAssignModal(true);
    if (allUsers.length === 0) {
      usersAPI.getAll().then((res) => setAllUsers(res.data));
    }
  };

  const toggleAssignEditAssignee = (userId: number) => {
    setAssignEditAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setAssignEditObserverIds((prev) => prev.filter((id) => id !== userId));
    if (assignEditResponsibleId === userId) setAssignEditResponsibleId(null);
  };

  const toggleAssignEditObserver = (userId: number) => {
    setAssignEditObserverIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setAssignEditAssigneeIds((prev) => prev.filter((id) => id !== userId));
    if (assignEditResponsibleId === userId) setAssignEditResponsibleId(null);
  };

  const toggleAssignEditResponsible = (userId: number) => {
    setAssignEditResponsibleId((prev) => (prev === userId ? null : userId));
    setAssignEditAssigneeIds((prev) => prev.filter((id) => id !== userId));
    setAssignEditObserverIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    try {
      setIsSavingAssign(true);
      await ticketsAPI.assign(ticket.id, {
        assigneeIds: assignEditAssigneeIds,
        observerIds: assignEditObserverIds.length > 0 ? assignEditObserverIds : undefined,
        responsibleId: assignEditResponsibleId ?? undefined,
      });
      loadTicket();
      setShowAssignModal(false);
      if (ticket) notify({ type: 'success', title: 'Asignaciones guardadas', entityType: 'ticket', entityId: ticket.id });
    } catch (error: any) {
      if (ticket) notify({ type: 'error', title: 'Error al guardar asignaciones', body: error.response?.data?.message, entityType: 'ticket', entityId: ticket.id });
    } finally {
      setIsSavingAssign(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticket) return;
    try {
      setIsDeletingTicket(true);
      await ticketsAPI.delete(ticket.id);
      setShowDeleteModal(false);
      goBack();
    } catch (error: any) {
      if (ticket) notify({ type: 'error', title: 'Error al eliminar el ticket', body: error.response?.data?.message, entityType: 'ticket', entityId: ticket.id });
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
      loadTicket();
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
      loadTicket();
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
      loadTicket();
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
      loadTicket();
    } catch (error) {
      console.error('Error logging time:', error);
    } finally {
      setIsSubmittingTime(false);
    }
  };

  const handleToggleChecklistItem = async (item: TicketChecklistItem) => {
    if (!ticket) return;
    try {
      setTogglingItemId(item.id);
      await ticketsAPI.updateChecklistItem(ticket.id, item.id, { isCompleted: !item.isCompleted });
      loadTicket();
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
      loadTicket();
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
      loadTicket();
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

  const closeImagePreview = () => {
    setImageExpanded(false);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview.url);
      setImagePreview(null);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!ticket) return;
    if (!window.confirm('¿Eliminar este adjunto?')) return;
    try {
      await ticketsAPI.deleteAttachment(ticket.id, attachmentId);
      loadTicket();
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
      loadTicket();
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
      loadTicket();
      if (ticket) notify({ type: 'success', title: 'Tag asignado al ticket', entityType: 'ticket', entityId: ticket.id });
    } catch (error: any) {
      if (ticket) notify({ type: 'error', title: 'Error al asignar tag', body: error.response?.data?.message, entityType: 'ticket', entityId: ticket.id });
    } finally {
      setAddingTagId(null);
    }
  };

  const handleRemoveTagFromTicket = async (tagId: number) => {
    if (!ticket) return;
    try {
      setRemovingTagId(tagId);
      await tagsAPI.removeFromTicket(ticket.id, tagId);
      loadTicket();
    } catch (error) {
      console.error('Error al quitar tag:', error);
    } finally {
      setRemovingTagId(null);
    }
  };

  if (isLoading) {
    return <PageLoader message="Cargando ticket..." />;
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">Ticket no encontrado</p>
        <Button variant="secondary" onClick={() => goBack()} className="mt-4">
          Volver a Tickets
        </Button>
      </div>
    );
  }

  const totalHours = timeEntries.reduce((sum, t) => sum + Number(t.hoursSpent || 0), 0);

  const tabs = [
    { id: 'details', label: 'Detalles' },
    { id: 'checklist', label: 'Checklist', badge: ticket.checklistItems?.length || 0 },
    { id: 'documents', label: 'Documentos', badge: ticket.attachments?.length || 0 },
    { id: 'transitions', label: 'Movimientos', badge: ticket.transitions?.length || 0 },
    { id: 'comments', label: 'Comentarios', badge: comments.length },
    { id: 'time', label: 'Tiempo', badge: timeEntries.length },
  ];

  const canEditTicket = ticket?.createdBy?.id === user?.id;
  const isResponsible = ticket?.assignments?.some((a) => a.role === 'responsible' && a.user.id === user?.id) ?? false;
  const canManageTicket = canEditTicket || isResponsible;
  // Observadores y asignados pueden comentar (pero no gestionar el ticket)
  const isParticipant = ticket?.assignments?.some((a) => a.user.id === user?.id) ?? false;
  const canComment = canManageTicket || isParticipant;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <button
              onClick={() => goBack()}
              className="p-1 hover:bg-light-hover dark:hover:bg-dark-hover rounded transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </button>
            <span>Ticket #{ticket.id}</span>
          </div>
        }
        subtitle={ticket.title}
        actions={
          <div className="flex gap-2">
            {canEditTicket && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowMoveModal(true)}
                  leftIcon={<ArrowRightLeft className="w-4 h-4" />}
                >
                  Mover
                </Button>
                {isEditing ? (
                  <>
                    <Button variant="secondary" onClick={() => setIsEditing(false)} leftIcon={<X className="w-4 h-4" />}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveEdit} leftIcon={<Save className="w-4 h-4" />}>
                      Guardar
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => setIsEditing(true)} leftIcon={<Edit2 className="w-4 h-4" />}>
                    Editar
                  </Button>
                )}
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteModal(true)}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Eliminar
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Edit Assignments Modal */}
      {showAssignModal && ticket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Editar asignaciones</CardTitle>
            </CardHeader>
            <form onSubmit={handleSaveAssign} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-2">Responsables</p>
                  <div className="flex flex-wrap gap-2">
                    {allUsers.map((u) => {
                      const isAssignee = assignEditAssigneeIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleAssignEditAssignee(u.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm transition-colors ${
                            isAssignee
                              ? 'bg-violet-500/15 border-violet-500/50 text-zinc-900 dark:text-white'
                              : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-violet-500/40'
                          }`}
                        >
                          <Avatar name={u.name} size="xs" />
                          {u.name}
                          {isAssignee && <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    Responsable de seguimiento
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allUsers.map((u) => {
                      const isSelected = assignEditResponsibleId === u.id;
                      const isAssignee = assignEditAssigneeIds.includes(u.id);
                      const isObserver = assignEditObserverIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleAssignEditResponsible(u.id)}
                          disabled={isAssignee || isObserver}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm transition-colors ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-zinc-900 dark:text-white'
                              : (isAssignee || isObserver)
                                ? 'border-zinc-200 dark:border-zinc-700 text-zinc-400 cursor-not-allowed opacity-60'
                                : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-emerald-500/40'
                          }`}
                        >
                          <Avatar name={u.name} size="xs" />
                          {u.name}
                          {isSelected && <Shield className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    En observación
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allUsers.map((u) => {
                      const isObserver = assignEditObserverIds.includes(u.id);
                      const isAssignee = assignEditAssigneeIds.includes(u.id);
                      const isResp = assignEditResponsibleId === u.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleAssignEditObserver(u.id)}
                          disabled={isAssignee || isResp}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm transition-colors ${
                            isObserver
                              ? 'bg-amber-500/15 border-amber-500/50 text-zinc-900 dark:text-white'
                              : (isAssignee || isResp)
                                ? 'border-zinc-200 dark:border-zinc-700 text-zinc-400 cursor-not-allowed opacity-60'
                                : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-amber-500/40'
                          }`}
                        >
                          <Avatar name={u.name} size="xs" />
                          {u.name}
                          {isObserver && <Eye className="w-3.5 h-3.5 text-amber-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end gap-2 flex-shrink-0">
                <Button type="button" variant="secondary" onClick={() => setShowAssignModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSavingAssign}>
                  {isSavingAssign ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Ticket Modal */}
      {showDeleteModal && ticket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Eliminar ticket</CardTitle>
            </CardHeader>
            <div className="p-4 space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                ¿Estás seguro de que deseas eliminar el ticket <strong className="text-zinc-900 dark:text-white">#{ticket.id} – {ticket.title}</strong>? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeletingTicket}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleDeleteTicket} isLoading={isDeletingTicket} leftIcon={<Trash2 className="w-4 h-4" />}>
                  Eliminar ticket
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Mover Ticket a otro Departamento</CardTitle>
            </CardHeader>
            <form onSubmit={handleMoveTicket} className="space-y-4">
              <div>
                <p className="text-sm text-zinc-500 mb-4">
                  Departamento actual: <strong className="text-zinc-900 dark:text-white">{ticket.currentDepartment?.name}</strong>
                </p>
              </div>
              <Select
                label="Nuevo Departamento *"
                value={moveForm.toDepartmentId}
                onChange={(value) => setMoveForm({ ...moveForm, toDepartmentId: value })}
                options={departments
                  .filter(d => d.id !== ticket.currentDepartmentId)
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
                  className="w-full px-3 py-2 bg-light-bg dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
          </Card>
        </div>
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          <TabPanel tabId="details" activeTab={activeTab}>
            <Card>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">{ticket.title}</h3>
              <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                {ticket.description || 'Sin descripción'}
              </p>
            </Card>
          </TabPanel>

          <TabPanel tabId="checklist" activeTab={activeTab}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5" />
                  Checklist ({ticket.checklistItems?.length || 0})
                </CardTitle>
              </CardHeader>
              {canManageTicket && (
                <form onSubmit={handleAddChecklistItem} className="flex gap-2 mb-4">
                  <Input
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    placeholder="Nueva tarea..."
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" isLoading={isAddingChecklistItem} leftIcon={<Plus className="w-4 h-4" />}>
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
                  <p className="text-center text-zinc-500 py-6">No hay ítems en el checklist</p>
                )}
              </div>
            </Card>
          </TabPanel>

          <TabPanel tabId="documents" activeTab={activeTab}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5" />
                  Documentos ({ticket.attachments?.length || 0})
                </CardTitle>
              </CardHeader>
              {canManageTicket && (
                <form onSubmit={handleUploadAttachments} className="flex flex-wrap items-center justify-center gap-3 mb-4 p-3 bg-light-bg dark:bg-dark-surface rounded-lg">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleAttachmentFilesChange}
                    className="hidden"
                    id="ticket-detail-add-files"
                  />
                  <label
                    htmlFor="ticket-detail-add-files"
                    className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-light-border dark:border-dark-border rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Seleccionar archivos
                  </label>
                  {newAttachmentFiles.length > 0 && (
                    <>
                      <span className="text-sm text-zinc-500">
                        {newAttachmentFiles.length} archivo(s) seleccionado(s)
                      </span>
                      <Button type="submit" size="sm" isLoading={isUploadingAttachments} leftIcon={<Upload className="w-4 h-4" />}>
                        Subir documentos
                      </Button>
                      <button
                        type="button"
                        onClick={() => setNewAttachmentFiles([])}
                        className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
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
                  <p className="text-center text-zinc-500 py-6">No hay documentos adjuntos</p>
                )}
              </div>
            </Card>
          </TabPanel>

          <TabPanel tabId="transitions" activeTab={activeTab}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Historial de Movimientos ({ticket.transitions?.length || 0})
                </CardTitle>
              </CardHeader>

              <div className="space-y-4">
                {ticket.transitions && ticket.transitions.length > 0 ? (
                  ticket.transitions.map((transition) => (
                    <div key={transition.id} className="flex gap-4 p-4 bg-light-bg dark:bg-dark-surface rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <ArrowRightLeft className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">{transition.fromDepartment.name}</Badge>
                          <ArrowRightLeft className="w-4 h-4 text-zinc-400" />
                          <Badge variant="primary">{transition.toDepartment.name}</Badge>
                        </div>
                        {transition.note && (
                          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            "{transition.note}"
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                          <Avatar name={transition.movedByUser.name} size="xs" />
                          <span>{transition.movedByUser.name}</span>
                          <span>•</span>
                          <span>{format(new Date(transition.movedAt), 'dd MMM yyyy, HH:mm', { locale: es })}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-zinc-500 py-8">
                    Este ticket no ha sido movido entre departamentos
                  </p>
                )}
              </div>
            </Card>
          </TabPanel>

          <TabPanel tabId="comments" activeTab={activeTab}>
            <Card>
              <CardHeader>
                <CardTitle>Comentarios ({comments.length})</CardTitle>
              </CardHeader>

              {canComment && (
                <form onSubmit={handleAddComment} className="mb-6">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe un comentario..."
                    rows={3}
                    className="w-full px-3 py-2 bg-light-bg dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary mb-2"
                  />
                  <Button type="submit" size="sm" isLoading={isSubmittingComment}>
                    Agregar Comentario
                  </Button>
                </form>
              )}

              <div className="space-y-4">
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
                            <span className="font-medium text-zinc-900 dark:text-white">{comment.user.name}</span>
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
                  <p className="text-center text-zinc-500 py-4">No hay comentarios</p>
                )}
              </div>
            </Card>
          </TabPanel>

          <TabPanel tabId="time" activeTab={activeTab}>
            <Card>
              <CardHeader>
                <CardTitle>Registro de Tiempo (Total: {totalHours.toFixed(1)}h)</CardTitle>
              </CardHeader>

              <form onSubmit={handleAddTime} className="flex gap-4 mb-6">
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
                <Button type="submit" size="sm" isLoading={isSubmittingTime}>
                  Registrar
                </Button>
              </form>

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
                      <span className="font-medium text-zinc-900 dark:text-white">{entry.hoursSpent}h</span>
                      <p className="text-xs text-zinc-500">
                        {format(new Date(entry.loggedAt), 'dd MMM', { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
                {timeEntries.length === 0 && (
                  <p className="text-center text-zinc-500 py-4">No hay tiempo registrado</p>
                )}
              </div>
            </Card>
          </TabPanel>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Card */}
          <Card>
            <h4 className="text-sm font-medium text-zinc-500 mb-3">Estado</h4>
            {canEditTicket && isEditing ? (
              <Select
                value={editForm.status}
                onChange={(value) => setEditForm({ ...editForm, status: value })}
                options={[
                  { value: 'open', label: 'Abierto' },
                  { value: 'in_progress', label: 'En Progreso' },
                  { value: 'blocked', label: 'Bloqueado' },
                  { value: 'done', label: 'Completado' },
                ]}
              />
            ) : (
              <StatusBadge status={ticket.status} />
            )}

            <h4 className="text-sm font-medium text-zinc-500 mb-3 mt-4">Prioridad</h4>
            {canEditTicket && isEditing ? (
              <Select
                value={editForm.priority}
                onChange={(value) => setEditForm({ ...editForm, priority: value })}
                options={[
                  { value: 'low', label: 'Baja' },
                  { value: 'medium', label: 'Media' },
                  { value: 'high', label: 'Alta' },
                ]}
              />
            ) : (
              <PriorityBadge priority={ticket.priority} />
            )}
          </Card>

          {/* Departments */}
          <Card>
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-3">
              <Building2 className="w-4 h-4" />
              Departamentos
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-zinc-500">Origen</span>
                <p className="text-zinc-900 dark:text-white">{ticket.originDepartment?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Actual</span>
                <p className="text-zinc-900 dark:text-white font-medium">{ticket.currentDepartment?.name || 'N/A'}</p>
              </div>
              {ticket.targetDepartment && (
                <div>
                  <span className="text-xs text-zinc-500">Destino</span>
                  <p className="text-zinc-900 dark:text-white">{ticket.targetDepartment.name}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Project */}
          <Card>
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <FolderKanban className="w-4 h-4" />
              Proyecto
            </div>
            <p className="text-zinc-900 dark:text-white">{ticket.project?.name || 'Sin proyecto'}</p>
          </Card>

          {/* Dates */}
          <Card>
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                  <Calendar className="w-4 h-4" />
                  Creado
                </div>
                <p className="text-zinc-900 dark:text-white text-sm">
                  {format(new Date(ticket.createdAt), 'dd MMM yyyy, HH:mm', { locale: es })}
                </p>
              </div>

              {ticket.startDate && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                    <Clock className="w-4 h-4" />
                    Fecha de inicio
                  </div>
                  <p className="text-zinc-900 dark:text-white text-sm">
                    {format(new Date(ticket.startDate), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
              )}

              {ticket.dueDate && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                    <Clock className="w-4 h-4" />
                    Fecha Compromiso
                  </div>
                  <p className={`text-sm ${new Date(ticket.dueDate) < new Date() ? 'text-accent-danger' : 'text-zinc-900 dark:text-white'}`}>
                    {format(new Date(ticket.dueDate), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Assignees / Observers */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <User className="w-4 h-4" />
                Asignados
              </div>
              {canEditTicket && (
                <Button variant="ghost" size="sm" onClick={openAssignModal}>
                  Editar asignaciones
                </Button>
              )}
            </div>
            {(() => {
              const assignees = (ticket.assignments ?? []).filter((a) => a.role === 'assignee');
              const responsible = (ticket.assignments ?? []).find((a) => a.role === 'responsible');
              const observers = (ticket.assignments ?? []).filter((a) => a.role === 'observer');
              if (assignees.length === 0 && !responsible && observers.length === 0) {
                return <p className="text-zinc-500 text-sm">Sin asignar</p>;
              }
              return (
                <div className="space-y-3">
                  {responsible && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Responsable de seguimiento
                      </p>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Avatar name={responsible.user.name} size="xs" />
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{responsible.user.name}</span>
                        <Shield className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                      </div>
                    </div>
                  )}
                  {assignees.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Ejecutores</p>
                      <div className="space-y-2">
                        {assignees.map((a) => (
                          <div key={a.user.id} className="flex items-center gap-2">
                            <Avatar name={a.user.name} size="xs" />
                            <span className="text-sm text-zinc-900 dark:text-white">{a.user.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {observers.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">En observación</p>
                      <div className="space-y-2">
                        {observers.map((o) => (
                          <div key={o.user.id} className="flex items-center gap-2">
                            <Avatar name={o.user.name} size="xs" />
                            <span className="text-sm text-zinc-900 dark:text-white">{o.user.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </Card>

          {/* Tags */}
          <Card>
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-3">
              <Tag className="w-4 h-4" />
              Tags
            </div>
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
                    const tagId = e.target.value ? parseInt(e.target.value, 10) : 0;
                    if (tagId) handleAddTagToTicket(tagId);
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
                <span className="text-zinc-500 text-sm">Sin tags. Crea tags en el tablero (vista Lista).</span>
              )}
            </div>
          </Card>

          {/* Created By */}
          <Card>
            <div className="text-sm text-zinc-500 mb-2">Creado por</div>
            <div className="flex items-center gap-2">
              <Avatar name={ticket.createdBy?.name || 'Usuario'} size="sm" />
              <div>
                <p className="text-zinc-900 dark:text-white text-sm">{ticket.createdBy?.name}</p>
                <p className="text-zinc-500 text-xs">{ticket.createdBy?.email}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MoreVertical, Building2 } from 'lucide-react';
import { clientsAPI } from '../../services/api';
import { notify } from '../../store/notificationStore';
import type { Client } from '../../types';
import {
  PageHeader,
  Button,
  Table,
  Modal,
  Input,
  ConfirmDialog,
  Dropdown,
  EmptyState,
} from '../../components/ui';

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    identification: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const response = await clientsAPI.getAll();
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        businessName: client.businessName || '',
        identification: client.identification || '',
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', businessName: '', identification: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      notify({ type: 'error', title: 'El nombre del cliente es requerido' });
      return;
    }
    try {
      if (editingClient) {
        await clientsAPI.update(editingClient.id, formData);
        notify({ type: 'success', title: 'Cliente actualizado correctamente' });
      } else {
        await clientsAPI.create(formData);
        notify({ type: 'success', title: 'Cliente creado correctamente' });
      }
      handleCloseModal();
      loadClients();
    } catch (error: any) {
      const msg = error.response?.data?.message;
      notify({
        type: 'error',
        title: 'Error al guardar cliente',
        body: Array.isArray(msg) ? msg.join(', ') : msg,
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await clientsAPI.delete(deleteConfirm.id);
      notify({ type: 'success', title: 'Cliente eliminado' });
      setDeleteConfirm(null);
      loadClients();
    } catch (error: any) {
      const msg = error.response?.data?.message;
      notify({
        type: 'error',
        title: 'Error al eliminar cliente',
        body: Array.isArray(msg) ? msg.join(', ') : msg,
      });
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Cliente',
      sortable: true,
      render: (client: Client) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">
              {client.name}
            </p>
            {client.businessName && (
              <p className="text-xs text-zinc-500 truncate max-w-xs">
                {client.businessName}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'identification',
      header: 'RNC / Cédula',
      render: (client: Client) => (
        <span className="text-zinc-600 dark:text-zinc-400">
          {client.identification || '—'}
        </span>
      ),
    },
    {
      key: 'businessName',
      header: 'Razón Social',
      render: (client: Client) => (
        <span className="text-zinc-600 dark:text-zinc-400">
          {client.businessName || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (client: Client) => (
        <Dropdown
          trigger={
            <button className="p-1 hover:bg-light-hover dark:hover:bg-dark-hover rounded">
              <MoreVertical className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </button>
          }
          items={[
            {
              id: 'edit',
              label: 'Editar',
              icon: <Edit className="w-4 h-4" />,
              onClick: () => handleOpenModal(client),
            },
            { id: 'divider', label: '', divider: true },
            {
              id: 'delete',
              label: 'Eliminar',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: () => setDeleteConfirm(client),
            },
          ]}
          align="right"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Gestión de clientes del sistema"
        actions={
          <Button
            onClick={() => handleOpenModal()}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nuevo Cliente
          </Button>
        }
      />

      {clients.length > 0 ? (
        <Table
          columns={columns}
          data={clients}
          keyExtractor={(c) => c.id}
          isLoading={isLoading}
        />
      ) : (
        <EmptyState
          icon="folder"
          title="No hay clientes"
          description="Crea tu primer cliente para comenzar"
          action={{
            label: 'Crear Cliente',
            onClick: () => handleOpenModal(),
          }}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingClient ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre del Cliente"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="Ej: Empresa ABC"
          />
          <Input
            label="Razón Social"
            value={formData.businessName}
            onChange={(e) =>
              setFormData({ ...formData, businessName: e.target.value })
            }
            placeholder="Ej: Empresa ABC S.R.L."
          />
          <Input
            label="Identificación (RNC / Cédula)"
            value={formData.identification}
            onChange={(e) =>
              setFormData({ ...formData, identification: e.target.value })
            }
            placeholder="Ej: 130-12345-6"
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar Cliente"
        message={`¿Estás seguro de eliminar el cliente "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};

export default ClientsPage;

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings, type TicketDetailMode } from '../context/SettingsContext';
import { PageHeader, Card, CardHeader, CardTitle, Avatar, Badge } from '../components/ui';
import { User, Mail, Shield, PanelRight, Layout, ExternalLink } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { ticketDetailMode, setTicketDetailMode } = useSettings();

  if (!user) return null;

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      dev: 'Desarrollador',
      user: 'Usuario',
    };
    return labels[role] || role;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Configuración"
        subtitle="Información de tu perfil"
      />

      {/* Profile Card */}
      <Card>
        <div className="flex items-start gap-6">
          <Avatar name={user.name} size="xl" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">{user.name}</h2>
            <p className="text-zinc-500">{user.email}</p>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant={user.role === 'admin' ? 'primary' : user.role === 'dev' ? 'info' : 'neutral'}>
                {getRoleLabel(user.role)}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Cuenta</CardTitle>
        </CardHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-light-bg dark:bg-dark-surface rounded-lg">
            <div className="p-2 rounded-lg bg-primary/20">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Nombre</p>
              <p className="font-medium text-zinc-900 dark:text-white">{user.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-light-bg dark:bg-dark-surface rounded-lg">
            <div className="p-2 rounded-lg bg-accent-info/20">
              <Mail className="w-5 h-5 text-accent-info" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Email</p>
              <p className="font-medium text-zinc-900 dark:text-white">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-light-bg dark:bg-dark-surface rounded-lg">
            <div className="p-2 rounded-lg bg-accent-success/20">
              <Shield className="w-5 h-5 text-accent-success" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Rol</p>
              <p className="font-medium text-zinc-900 dark:text-white">{getRoleLabel(user.role)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Visualización de detalle de ticket */}
      <Card>
        <CardHeader>
          <CardTitle>Visualización de detalle de ticket</CardTitle>
          <p className="text-sm text-zinc-500 mt-1">
            Elige cómo se abre el detalle de un ticket al hacer clic en el Kanban
          </p>
        </CardHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              {
                id: 'drawer' as TicketDetailMode,
                label: 'Panel lateral',
                description: 'Panel deslizante desde la derecha, sin salir del Kanban',
                icon: PanelRight,
              },
              {
                id: 'modal' as TicketDetailMode,
                label: 'Modal centrado',
                description: 'Ventana modal centrada en pantalla',
                icon: Layout,
              },
              {
                id: 'page' as TicketDetailMode,
                label: 'Página completa',
                description: 'Navegar a la página de detalle del ticket',
                icon: ExternalLink,
              },
            ] as const
          ).map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTicketDetailMode(id)}
              className={`flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                ticketDetailMode === id
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-light-border dark:border-dark-border hover:border-primary/50 hover:bg-light-hover dark:hover:bg-dark-hover'
              }`}
            >
              <div className={`p-2 rounded-lg ${ticketDetailMode === id ? 'bg-primary/20' : 'bg-light-bg dark:bg-dark-surface'}`}>
                <Icon className={`w-5 h-5 ${ticketDetailMode === id ? 'text-primary' : 'text-zinc-500'}`} />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">{label}</p>
                <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
        </CardHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-light-bg dark:bg-dark-surface rounded-lg">
            <p className="text-sm text-zinc-500">Versión</p>
            <p className="font-medium text-zinc-900 dark:text-white">2.0.0 Enterprise</p>
          </div>
          <div className="p-3 bg-light-bg dark:bg-dark-surface rounded-lg">
            <p className="text-sm text-zinc-500">Entorno</p>
            <p className="font-medium text-zinc-900 dark:text-white">Desarrollo</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;

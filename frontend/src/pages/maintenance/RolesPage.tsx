import React from 'react';
import { Shield, Check, X } from 'lucide-react';
import { PageHeader, Card, CardHeader, CardTitle, Badge } from '../../components/ui';

interface Permission {
  name: string;
  description: string;
  admin: boolean;
  developer: boolean;
  user: boolean;
}

const permissions: Permission[] = [
  // Projects
  { name: 'Ver proyectos', description: 'Ver lista y detalles de proyectos', admin: true, developer: true, user: true },
  { name: 'Crear proyectos', description: 'Crear nuevos proyectos', admin: true, developer: false, user: false },
  { name: 'Editar proyectos', description: 'Modificar proyectos existentes', admin: true, developer: false, user: false },
  { name: 'Eliminar proyectos', description: 'Eliminar proyectos del sistema', admin: true, developer: false, user: false },
  
  // Departments
  { name: 'Ver departamentos', description: 'Ver lista y detalles de departamentos', admin: true, developer: true, user: true },
  { name: 'Crear departamentos', description: 'Crear nuevos departamentos', admin: true, developer: false, user: false },
  { name: 'Editar departamentos', description: 'Modificar departamentos existentes', admin: true, developer: false, user: false },
  { name: 'Eliminar departamentos', description: 'Eliminar departamentos del sistema', admin: true, developer: false, user: false },
  
  // Users
  { name: 'Ver usuarios', description: 'Ver lista de usuarios del sistema', admin: true, developer: true, user: true },
  { name: 'Asignar departamentos', description: 'Asignar usuarios a departamentos', admin: true, developer: false, user: false },
  { name: 'Cambiar roles', description: 'Modificar roles de usuarios', admin: true, developer: false, user: false },
  
  // Tickets
  { name: 'Ver tickets', description: 'Ver todos los tickets del sistema', admin: true, developer: true, user: true },
  { name: 'Crear tickets', description: 'Crear nuevos tickets', admin: true, developer: true, user: true },
  { name: 'Editar cualquier ticket', description: 'Modificar cualquier ticket', admin: true, developer: false, user: false },
  { name: 'Editar tickets asignados', description: 'Modificar tickets asignados', admin: true, developer: true, user: false },
  { name: 'Editar tickets propios', description: 'Modificar tickets creados por uno mismo', admin: true, developer: true, user: true },
  { name: 'Eliminar tickets', description: 'Eliminar tickets del sistema', admin: true, developer: false, user: false },
  { name: 'Asignar usuarios a tickets', description: 'Asignar múltiples usuarios a tickets', admin: true, developer: true, user: true },
  
  // Comments & Time
  { name: 'Comentar en tickets', description: 'Agregar comentarios a tickets', admin: true, developer: true, user: true },
  { name: 'Registrar tiempo', description: 'Registrar tiempo trabajado en tickets', admin: true, developer: true, user: true },
];

const RolesPage: React.FC = () => {
  const renderPermissionIcon = (hasPermission: boolean) => {
    if (hasPermission) {
      return <Check className="w-5 h-5 text-accent-success" />;
    }
    return <X className="w-5 h-5 text-zinc-400 dark:text-zinc-600" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles y Permisos"
        subtitle="Matriz de permisos del sistema"
      />

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/20">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">Administrador</h3>
              <p className="text-xs text-zinc-500">Acceso completo</p>
            </div>
          </div>
          <Badge variant="primary">admin</Badge>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Control total del sistema. Puede gestionar proyectos, departamentos, usuarios y todos los tickets.
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent-info/20">
              <Shield className="w-6 h-6 text-accent-info" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">Desarrollador</h3>
              <p className="text-xs text-zinc-500">Desarrollo y resolución</p>
            </div>
          </div>
          <Badge variant="info">developer</Badge>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Puede crear tickets, trabajar en tickets asignados, registrar tiempo y comentar.
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700/50">
              <Shield className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">Usuario</h3>
              <p className="text-xs text-zinc-500">Creación y seguimiento</p>
            </div>
          </div>
          <Badge variant="neutral">user</Badge>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Puede crear tickets, dar seguimiento a sus solicitudes y agregar comentarios.
          </p>
        </Card>
      </div>

      {/* Permissions Matrix */}
      <Card padding="none">
        <CardHeader className="px-4 pt-4">
          <CardTitle>Matriz de Permisos</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Permiso
                </th>
                <th className="px-4 py-3 w-24 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Admin
                </th>
                <th className="px-4 py-3 w-24 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Developer
                </th>
                <th className="px-4 py-3 w-24 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                  User
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {permissions.map((permission, index) => (
                <tr key={index} className="hover:bg-light-hover dark:hover:bg-dark-hover transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{permission.name}</p>
                      <p className="text-xs text-zinc-500">{permission.description}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 w-24 text-center align-middle">
                    <span className="inline-flex justify-center w-full">
                      {renderPermissionIcon(permission.admin)}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-24 text-center align-middle">
                    <span className="inline-flex justify-center w-full">
                      {renderPermissionIcon(permission.developer)}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-24 text-center align-middle">
                    <span className="inline-flex justify-center w-full">
                      {renderPermissionIcon(permission.user)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default RolesPage;

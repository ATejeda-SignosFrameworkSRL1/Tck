import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectProvider } from './context/ProjectContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import Login from './pages/Login';
import { EnterpriseLayout } from './components/layout/EnterpriseLayout';
import { PageLoader } from './components/ui/Loader';

// Lazy load auth pages
const SecureRegister = React.lazy(() => import('./pages/SecureRegister'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));

// Lazy load pages
// Dashboards
const AdminDashboard = React.lazy(() => import('./pages/dashboards/AdminDashboard'));
const ManagerDashboard = React.lazy(() => import('./pages/dashboards/ManagerDashboard'));
const UserDashboard = React.lazy(() => import('./pages/dashboards/UserDashboard'));
const SipeDashboard = React.lazy(() => import('./pages/dashboards/SipeDashboard'));

// SIPE - Matriz, Gantt, Métricas
const MatrixView = React.lazy(() => import('./pages/MatrixView'));
const GanttView = React.lazy(() => import('./pages/GanttView'));
const DeliverableMatrix = React.lazy(() => import('./pages/DeliverableMatrix'));
const DeliverableFormPage = React.lazy(() => import('./pages/DeliverableFormPage'));
const ActaAceptacion = React.lazy(() => import('./pages/ActaAceptacion'));

// Kanban
const KanbanBoard = React.lazy(() => import('./pages/KanbanBoard'));

// Tickets
const CreateTicket = React.lazy(() => import('./pages/CreateTicket'));
const TicketDetail = React.lazy(() => import('./pages/TicketDetail'));

// Maintenance
const ProjectsPage = React.lazy(() => import('./pages/maintenance/ProjectsPage'));
const DepartmentsPage = React.lazy(() => import('./pages/maintenance/DepartmentsPage'));
const UsersPage = React.lazy(() => import('./pages/maintenance/UsersPage'));
const RolesPage = React.lazy(() => import('./pages/maintenance/RolesPage'));
const ClientsPage = React.lazy(() => import('./pages/maintenance/ClientsPage'));

// Settings
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));

// Dashboard Router - redirects based on role
const DashboardRouter = React.lazy(() => import('./pages/dashboards/DashboardRouter'));

const LoadingFallback = () => (
  <div className="min-h-[400px] flex items-center justify-center">
    <PageLoader />
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <Router>
          <ProjectProvider>
            <React.Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<SecureRegister />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Protected routes with Enterprise Layout */}
                <Route element={<EnterpriseLayout />}>
                  {/* Dashboard */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardRouter />} />
                  <Route path="/dashboard/admin" element={<AdminDashboard />} />
                  <Route path="/dashboard/manager" element={<ManagerDashboard />} />
                  <Route path="/dashboard/user" element={<UserDashboard />} />

                  {/* SIPE - Sistema Integrado de Planificación y Ejecución */}
                  <Route path="/matrix" element={<MatrixView />} />
                  <Route path="/matrix/:projectId" element={<MatrixView />} />
                  <Route path="/gantt" element={<GanttView />} />
                  <Route path="/gantt/:projectId" element={<GanttView />} />
                  <Route path="/deliverables" element={<DeliverableMatrix />} />
                  <Route path="/deliverables/new" element={<DeliverableFormPage />} />
                  <Route path="/deliverables/edit/:id" element={<DeliverableFormPage />} />
                  <Route path="/acta-aceptacion" element={<ActaAceptacion />} />
                  <Route path="/metrics" element={<SipeDashboard />} />
                  <Route path="/metrics/:projectId" element={<SipeDashboard />} />

                  {/* Kanban + Tickets (vista unificada) */}
                  <Route path="/kanban" element={<KanbanBoard />} />
                  <Route path="/tickets" element={<Navigate to="/kanban" replace />} />
                  <Route path="/tickets/new" element={<CreateTicket />} />
                  <Route path="/tickets/:id" element={<TicketDetail />} />

                  {/* Maintenance */}
                  <Route path="/maintenance/projects" element={<ProjectsPage />} />
                  <Route path="/maintenance/departments" element={<DepartmentsPage />} />
                  <Route path="/maintenance/users" element={<UsersPage />} />
                  <Route path="/maintenance/roles" element={<RolesPage />} />
                  <Route path="/maintenance/clients" element={<ClientsPage />} />

                  {/* Settings */}
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </React.Suspense>
          </ProjectProvider>
        </Router>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;

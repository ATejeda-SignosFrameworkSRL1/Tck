import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketsAPI } from '../services/api';
import type { Ticket } from '../types';
import TicketCard from '../components/tickets/TicketCard';
import ProjectSelector from '../components/projects/ProjectSelector';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    searchParams.get('projectId') ? Number(searchParams.get('projectId')) : null
  );

  useEffect(() => {
    loadTickets();
  }, [filter, selectedProjectId]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (selectedProjectId) {
        params.projectId = selectedProjectId;
      }

      if (filter === 'my-tickets') {
        params.createdById = user?.id;
      } else if (filter === 'assigned') {
        params.assignedToId = user?.id;
      } else if (filter !== 'all') {
        params.status = filter;
      }

      const response = await ticketsAPI.getAll(params);
      setTickets(response.data);
    } catch (error) {
      console.error('Error al cargar tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-bold text-gray-900">Sistema de Tickets</h1>
              <div className="flex space-x-4 text-sm">
                <Link to="/" className="text-gray-700 hover:text-indigo-600">
                  Tickets
                </Link>
                <Link to="/projects" className="text-gray-700 hover:text-indigo-600">
                  Proyectos
                </Link>
                {user?.role === 'admin' && (
                  <>
                    <Link to="/departments" className="text-gray-700 hover:text-indigo-600">
                      Departamentos
                    </Link>
                    <Link to="/users/manage" className="text-gray-700 hover:text-indigo-600">
                      Usuarios
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.name} ({user?.role})
              </span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-900"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Tickets</h2>
            <Link
              to="/tickets/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Crear Ticket
            </Link>
          </div>

          {/* Project Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Proyecto:
            </label>
            <ProjectSelector
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              showAllOption={true}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Filters */}
          <div className="mb-6 flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('my-tickets')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'my-tickets'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Mis Tickets
            </button>
            <button
              onClick={() => setFilter('assigned')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'assigned'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Asignados a Mí
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'open'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Abiertos
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'in_progress'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              En Progreso
            </button>
          </div>

          {/* Tickets List */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Cargando tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay tickets para mostrar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} onUpdate={loadTickets} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

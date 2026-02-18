import React from 'react';
import { Link } from 'react-router-dom';
import type { Ticket } from '../../types';
import StatusBadge from './StatusBadge';

interface TicketCardProps {
  ticket: Ticket;
  onUpdate: () => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="block bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{ticket.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <StatusBadge status={ticket.status} />
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              ticket.priority === 'high'
                ? 'bg-red-100 text-red-800'
                : ticket.priority === 'medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {ticket.priority === 'high' ? 'Alta' : ticket.priority === 'medium' ? 'Media' : 'Baja'}
          </span>
        </div>
      </div>

      {/* Project and Due Date */}
      <div className="mt-4 flex items-center justify-between text-xs">
        {ticket.project && (
          <span className="text-gray-500">
            📁 {ticket.project.name}
          </span>
        )}
        {ticket.dueDate && (
          <span
            className={`font-medium ${
              new Date(ticket.dueDate) < new Date()
                ? 'text-red-600'
                : new Date(ticket.dueDate).getTime() - new Date().getTime() <
                  7 * 24 * 60 * 60 * 1000
                ? 'text-yellow-600'
                : 'text-gray-500'
            }`}
          >
            📅 {new Date(ticket.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="mt-3 text-sm text-gray-500">
        <span>Creado por: {ticket.createdBy.name}</span>
      </div>

      {/* Assigned Users / Observers */}
      {ticket.assignments && ticket.assignments.length > 0 && (() => {
        const assignees = ticket.assignments.filter((a) => a.role !== 'observer');
        const observers = ticket.assignments.filter((a) => a.role === 'observer');
        return (
          <div className="mt-2 text-xs text-gray-500 space-y-0.5">
            {assignees.length > 0 && (
              <div>
                <span className="font-medium">Responsables: </span>
                {assignees.map((a, idx) => (
                  <span key={a.user?.id ?? a.id}>
                    {a.user.name}
                    {idx < assignees.length - 1 && ', '}
                  </span>
                ))}
              </div>
            )}
            {observers.length > 0 && (
              <div>
                <span className="font-medium">En observación: </span>
                {observers.map((o, idx) => (
                  <span key={o.user?.id ?? o.id}>
                    {o.user.name}
                    {idx < observers.length - 1 && ', '}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <div className="mt-2 text-xs text-gray-400">
        {new Date(ticket.createdAt).toLocaleDateString()}
      </div>
    </Link>
  );
};

export default TicketCard;

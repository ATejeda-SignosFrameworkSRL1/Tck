import React from 'react';

interface User {
  id: number;
  name: string;
}

interface TicketHistory {
  id: number;
  ticketId: number;
  user: User;
  userId: number;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
}

interface HistoryTimelineProps {
  history: TicketHistory[];
}

const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ history }) => {
  if (history.length === 0) {
    return <p className="text-sm text-gray-500">No hay historial aún.</p>;
  }

  const getFieldLabel = (field: string) => {
    const labels: { [key: string]: string } = {
      created: 'Creación',
      status: 'Estado',
      priority: 'Prioridad',
      assignedTo: 'Asignación',
    };
    return labels[field] || field;
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {history.map((entry, idx) => (
          <li key={entry.id}>
            <div className="relative pb-8">
              {idx !== history.length - 1 && (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white">
                    <svg
                      className="h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{entry.user.name}</span>{' '}
                      {entry.fieldChanged === 'created' ? (
                        'creó el ticket'
                      ) : (
                        <>
                          cambió <span className="font-medium">{getFieldLabel(entry.fieldChanged)}</span>
                          {entry.oldValue && entry.newValue && (
                            <>
                              {' '}de <span className="font-medium">{entry.oldValue}</span> a{' '}
                              <span className="font-medium">{entry.newValue}</span>
                            </>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                    {new Date(entry.changedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistoryTimeline;

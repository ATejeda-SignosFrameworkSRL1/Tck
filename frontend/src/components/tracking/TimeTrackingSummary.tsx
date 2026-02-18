import React from 'react';

interface User {
  id: number;
  name: string;
}

interface TimeTracking {
  id: number;
  ticketId: number;
  user: User;
  userId: number;
  hoursSpent: number;
  description?: string;
  loggedAt: string;
}

interface TimeTrackingSummaryProps {
  totalTime: number;
  timeEntries: TimeTracking[];
}

const TimeTrackingSummary: React.FC<TimeTrackingSummaryProps> = ({
  totalTime,
  timeEntries,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">Total de horas trabajadas</p>
        <p className="text-3xl font-bold text-indigo-600">{totalTime.toFixed(2)}h</p>
      </div>

      {timeEntries.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Entradas de tiempo</h4>
          <div className="space-y-2">
            {timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="text-sm border-l-2 border-indigo-500 pl-3 py-1"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{entry.user.name}</p>
                    {entry.description && (
                      <p className="text-gray-600 text-xs mt-1">{entry.description}</p>
                    )}
                  </div>
                  <span className="font-semibold text-indigo-600">
                    {entry.hoursSpent}h
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(entry.loggedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTrackingSummary;

import React, { useState } from 'react';
import { trackingAPI } from '../../services/api';

interface TimeTrackingFormProps {
  ticketId: number;
  onTimeLogged: () => void;
}

const TimeTrackingForm: React.FC<TimeTrackingFormProps> = ({ ticketId, onTimeLogged }) => {
  const [hoursSpent, setHoursSpent] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hoursSpent || parseFloat(hoursSpent) <= 0) return;

    setLoading(true);
    try {
      await trackingAPI.logTime(ticketId, {
        hoursSpent: parseFloat(hoursSpent),
        description: description.trim() || undefined,
      });
      setHoursSpent('');
      setDescription('');
      onTimeLogged();
    } catch (error) {
      console.error('Error al registrar tiempo:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="hours" className="block text-sm font-medium text-gray-700">
          Horas trabajadas
        </label>
        <input
          type="number"
          id="hours"
          step="0.25"
          min="0.1"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          value={hoursSpent}
          onChange={(e) => setHoursSpent(e.target.value)}
          placeholder="Ej: 2.5"
        />
      </div>
      <div>
        <label htmlFor="time-description" className="block text-sm font-medium text-gray-700">
          Descripción (opcional)
        </label>
        <textarea
          id="time-description"
          rows={2}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué se hizo..."
        />
      </div>
      <button
        type="submit"
        disabled={loading || !hoursSpent || parseFloat(hoursSpent) <= 0}
        className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
      >
        {loading ? 'Registrando...' : 'Registrar Tiempo'}
      </button>
    </form>
  );
};

export default TimeTrackingForm;

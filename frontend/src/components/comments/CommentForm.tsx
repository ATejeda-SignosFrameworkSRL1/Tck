import React, { useState } from 'react';
import { commentsAPI } from '../../services/api';

interface CommentFormProps {
  ticketId: number;
  onCommentAdded: () => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ ticketId, onCommentAdded }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await commentsAPI.create(ticketId, content);
      setContent('');
      onCommentAdded();
    } catch (error) {
      console.error('Error al agregar comentario:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
          Agregar comentario
        </label>
        <textarea
          id="comment"
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe tu comentario..."
        />
      </div>
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
      >
        {loading ? 'Enviando...' : 'Comentar'}
      </button>
    </form>
  );
};

export default CommentForm;

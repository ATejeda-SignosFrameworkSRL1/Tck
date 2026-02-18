import React from 'react';

interface User {
  id: number;
  name: string;
}

interface Comment {
  id: number;
  content: string;
  user: User;
  createdAt: string;
}

interface CommentListProps {
  comments: Comment[];
}

const CommentList: React.FC<CommentListProps> = ({ comments }) => {
  if (comments.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No hay comentarios aún. Sé el primero en comentar.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="border-l-4 border-indigo-500 pl-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">{comment.user.name}</span>
            <span className="text-xs text-gray-500">
              {new Date(comment.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
        </div>
      ))}
    </div>
  );
};

export default CommentList;

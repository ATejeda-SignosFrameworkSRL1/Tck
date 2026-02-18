import { create } from 'zustand';
import type { Notification, NotificationInput } from '../types';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function isDuplicate(existing: Notification, input: NotificationInput): boolean {
  if (input.id && existing.id === input.id) return true;
  const hasKey =
    input.entityType != null &&
    input.entityId != null &&
    input.type &&
    input.title;
  if (!hasKey) return false;
  return (
    existing.entityType === input.entityType &&
    existing.entityId === input.entityId &&
    existing.type === input.type &&
    existing.title === input.title
  );
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (input: NotificationInput) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (input: NotificationInput) => {
    const id = input.id ?? generateId();
    const createdAt = input.createdAt ?? new Date().toISOString();
    const readAt = input.readAt ?? null;

    set((state) => {
      const existingById = state.notifications.find((n) => n.id === id);
      if (existingById) return state;

      const duplicateByKey = state.notifications.find((n) =>
        isDuplicate(n, { ...input, id })
      );
      if (duplicateByKey) return state;

      const newNotif: Notification = {
        id,
        entityType: input.entityType,
        entityId: input.entityId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
        readAt,
        createdAt,
      };

      return {
        notifications: [newNotif, ...state.notifications],
      };
    });
  },

  markAsRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n
      ),
    }));
  },

  markAllAsRead: () => {
    const now = new Date().toISOString();
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        readAt: n.readAt || now,
      })),
    }));
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  unreadCount: () => get().notifications.filter((n) => !n.readAt).length,
}));

/** Helper para disparar una notificación desde cualquier parte (acciones, catch, etc.). Sin duplicados por id o por (entityType+entityId+type+title). */
export function notify(input: NotificationInput): void {
  useNotificationStore.getState().addNotification(input);
}

import { apiRequest, type ApiPage } from "./client";

export interface ApiConversationParticipant { id: string; firstName: string; lastName: string; avatarUrl: string | null }

export interface ApiMessage { id: string; conversationId: string; senderId: string; body: string; isRead: boolean; createdAt: string }

export interface ApiConversation {
  id: string;
  propertyId: string;
  seekerId: string;
  listerId: string;
  updatedAt: string;
  property: { id: string; title: string; city: string; township: string; images: { url: string }[] };
  seeker: ApiConversationParticipant;
  lister: ApiConversationParticipant;
  /** Most recent message first; at most one. */
  messages: ApiMessage[];
  unreadCount: number;
}

export const listConversations = (page = 1) => apiRequest<ApiPage<ApiConversation>>(`/conversations?page=${page}`, { includeMeta: true });
export const getConversation = (id: string) => apiRequest<ApiConversation>(`/conversations/${encodeURIComponent(id)}`);
export const createConversation = (propertyId: string) => apiRequest<ApiConversation>("/conversations", { method: "POST", body: { propertyId } });
export const unreadMessageCount = () => apiRequest<{ count: number }>("/conversations/unread-count");

/** Newest first; pass the previous page's `nextCursor` as `before` to page back. */
export const listMessages = (conversationId: string, before?: string) =>
  apiRequest<{ data: ApiMessage[]; meta: { nextCursor: string | null } }>(
    `/conversations/${encodeURIComponent(conversationId)}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`,
    { includeMeta: true },
  );

export const sendMessage = (conversationId: string, body: string) => apiRequest<ApiMessage>(`/conversations/${encodeURIComponent(conversationId)}/messages`, { method: "POST", body: { body } });
export const markConversationRead = (conversationId: string) => apiRequest<{ updated: number }>(`/conversations/${encodeURIComponent(conversationId)}/read`, { method: "PATCH" });
export const markMessageRead = (id: string) => apiRequest<ApiMessage>(`/messages/${encodeURIComponent(id)}/read`, { method: "PATCH" });

/**
 * Opens (or reuses) a conversation with the seeker who requested a viewing.
 * The backend restricts this to the lister that owns the viewing.
 */
export const createConversationFromViewing = (viewingId: string) =>
  apiRequest<ApiConversation>("/conversations/from-viewing", { method: "POST", body: { viewingId } });

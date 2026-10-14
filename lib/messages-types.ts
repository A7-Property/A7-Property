/**
 * Shared view-model shapes for device-local and server-backed journeys. Both
 * modes present these identical shapes, so views render the same whether a
 * record came from PostgreSQL or from this browser's own activity.
 */

export interface ConversationMessage {
  id: string;
  sender: "user" | "owner";
  text: string;
  time: string;
  /** Only true when acknowledged by the message API. Absent for device-local messages. */
  isRead?: boolean;
}

export interface UserConversation {
  id: string;
  contact: string;
  propertyId: string;
  propertySnapshot?: { id: string; title: string; township: string; images: string[] };
  preview: string;
  time: string;
  unread: boolean;
  seekerName?: string;
  seekerId?: string;
  thread: ConversationMessage[];
}

export interface UserAppointment {
  id: string;
  propertyId: string;
  date: string;
  time: string;
  contact: string;
  status: string;
  seekerName?: string;
}

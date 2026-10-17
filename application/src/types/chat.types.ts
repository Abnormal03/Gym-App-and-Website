export type ChatContactType =
  | "TRAINER"
  | "PHYSIOTHERAPIST"
  | "NUTRITION_CONSULTANT"
  | "NUTRITIONIST"
  | string;

export interface ChatContact {
  id: number | string;
  name: string;
  type: ChatContactType;
  photoUrl: string | null;
}

export interface ChatMessagePreview {
  id?: number | string;
  content: string;
  createdAt: string;
  senderId?: number | string;
}

export interface ChatConversation {
  id: number | string;
  /** Thread creation time; used as the activity fallback before its first message. */
  createdAt?: string;
  contact: ChatContact;
  eligible: boolean;
  bookingId: number | string | null;
  purchaseId: number | string | null;
  lastMessage: ChatMessagePreview | null;
  unreadCount: number;
}

export interface EligibleChatContact extends ChatContact {
  bookingId: number | string | null;
  purchaseId: number | string | null;
  eligible: boolean;
}

export interface ChatMessage {
  id: number | string;
  conversationId: number | string;
  senderId: number | string;
  senderType: string;
  content: string;
  createdAt: string;
  readAt?: string | null;
}

export interface ChatMessagePage {
  messages: ChatMessage[];
  nextCursor: string | null;
}

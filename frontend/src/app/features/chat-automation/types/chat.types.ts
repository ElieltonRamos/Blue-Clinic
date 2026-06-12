export type ConversationStatus = 'bot' | 'human' | 'waiting';
export type MessageSender = 'patient' | 'bot' | 'human';

export interface Conversation {
  id: number;
  phone: string;
  patientName: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  status: ConversationStatus;
  unread: number;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  sender: MessageSender;
  text: string;
  sentAt: string;
  senderName?: string | null;
  senderRole?: string | null;
}

export interface PatientInfo {
  id: number | null;
  name: string | null;
  phone: string | null;
  memberSince: string | null;
  lastVisit: string | null;
  blocked: boolean;
}

export interface ConversationStatusUpdate {
  status: ConversationStatus;
}

export interface SendMessageDto {
  text: string;
}

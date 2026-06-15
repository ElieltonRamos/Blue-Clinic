export type ConversationStatus = 'bot' | 'human' | 'waiting';
export type MessageSender = 'patient' | 'bot' | 'human';

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageStatusUpdate {
  messageId: number;
  status: MessageStatus;
  errorCode?: number;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  sender: MessageSender;
  text: string;
  sentAt: string;
  senderName?: string | null;
  senderRole?: string | null;
  status?: MessageStatus | null;
  wamid?: string | null;
}

export interface Conversation {
  id: number;
  phone: string;
  patientName: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  status: ConversationStatus;
  unread: number;
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

export interface WhatsappTemplateParameter {
  type: string;
  text?: string;
}

export interface WhatsappTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  text?: string;
  format?: string;
  example?: { body_text: string[][] };
  buttons?: { type: string; text: string }[];
}

export interface WhatsappTemplate {
  id: string;
  name: string;
  status: string;
  components: WhatsappTemplateComponent[];
}

export type ConversationStatus = 'bot' | 'human' | 'waiting';

export interface Conversation {
  id: string;
  patientName: string;
  patientAvatar: string;
  lastMessage: string;
  time: string;
  status: ConversationStatus;
  unread?: number;
}

export type MessageSender = 'patient' | 'bot';

export interface TimeSlot {
  label: string;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  time: string;
  slots?: TimeSlot[];
}

export interface PatientInfo {
  id: string;
  name: string;
  since: string;
  avatarUrl: string;
  lastVisit: string;
  paymentStatus: 'Em dia' | 'Pendente' | 'Atrasado';
  plan: string;
}

import { Injectable } from '@angular/core';
import { ChatMessage, Conversation, PatientInfo } from '../types/chat.types';

@Injectable()
export class ChatService {
  getConversations(): Conversation[] {
    return [
      {
        id: 'beatriz-mendonca',
        patientName: 'Beatriz Mendonça',
        patientAvatar: 'BM',
        lastMessage: 'Quero marcar consulta',
        time: '10:24 AM',
        status: 'bot',
      },
      {
        id: 'ricardo-alves',
        patientName: 'Ricardo Alves',
        patientAvatar: 'RA',
        lastMessage: 'Obrigado pelo retorno.',
        time: '09:15 AM',
        status: 'human',
      },
      {
        id: 'elena-ferreira',
        patientName: 'Elena Ferreira',
        patientAvatar: 'EF',
        lastMessage: 'Pode me enviar o boleto?',
        time: 'Ontem',
        status: 'waiting',
      },
    ];
  }

  getMessages(conversationId: string): ChatMessage[] {
    const map: Record<string, ChatMessage[]> = {
      'beatriz-mendonca': [
        {
          id: '1',
          sender: 'patient',
          text: 'Olá, bom dia! Gostaria de marcar uma consulta com o Dr. Smith para a próxima semana.',
          time: '10:22 AM',
        },
        {
          id: '2',
          sender: 'bot',
          text: 'Olá Beatriz! Sou o assistente virtual da BlueClinic. Posso te ajudar com isso.\n\nAqui estão os horários disponíveis para o Dr. Smith na próxima semana:',
          time: '10:22 AM',
          slots: [
            { label: 'Segunda, 14:00' },
            { label: 'Terça, 09:30' },
            { label: 'Quarta, 16:00' },
            { label: 'Sexta, 11:00' },
          ],
        },
        {
          id: '3',
          sender: 'patient',
          text: 'A segunda às 14:00 funciona muito bem para mim!',
          time: '10:24 AM',
        },
        {
          id: '4',
          sender: 'bot',
          text: 'Ótimo! Consulta agendada para segunda-feira às 14:00 com o Dr. Smith. Você receberá uma confirmação em breve.',
          time: '10:24 AM',
        },
      ],
      'ricardo-alves': [
        {
          id: '1',
          sender: 'patient',
          text: 'Obrigado pelo retorno.',
          time: '09:15 AM',
        },
      ],
      'elena-ferreira': [
        {
          id: '1',
          sender: 'patient',
          text: 'Pode me enviar o boleto da consulta?',
          time: 'Ontem',
        },
      ],
    };
    return map[conversationId] ?? [];
  }

  getPatient(conversationId: string): PatientInfo {
    const map: Record<string, PatientInfo> = {
      'beatriz-mendonca': {
        id: 'beatriz-mendonca',
        name: 'Beatriz Mendonça',
        since: 'Maio 2023',
        avatarUrl: 'https://i.pravatar.cc/150?img=47',
        lastVisit: '14 Ago, 2023',
        paymentStatus: 'Em dia',
        plan: 'CarePlus Premium',
      },
      'ricardo-alves': {
        id: 'ricardo-alves',
        name: 'Ricardo Alves',
        since: 'Jan 2022',
        avatarUrl: 'https://i.pravatar.cc/150?img=12',
        lastVisit: '02 Set, 2023',
        paymentStatus: 'Pendente',
        plan: 'Unimed Basic',
      },
      'elena-ferreira': {
        id: 'elena-ferreira',
        name: 'Elena Ferreira',
        since: 'Mar 2024',
        avatarUrl: 'https://i.pravatar.cc/150?img=32',
        lastVisit: '10 Out, 2024',
        paymentStatus: 'Atrasado',
        plan: 'Particular',
      },
    };
    return map[conversationId];
  }
}

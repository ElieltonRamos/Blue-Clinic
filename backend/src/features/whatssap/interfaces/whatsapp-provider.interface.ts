// interfaces/whatsapp-provider.interface.ts

export interface NormalizedIncomingMessage {
  phone: string;
  text: string;
  wamid?: string;
  buttonPayload?: string;
  contextWamid?: string; // wamid da mensagem original, quando é resposta a template/botão
  fromMe?: boolean; // true quando enviado manualmente pelo celular (Baileys)
}

export interface IWhatsappProvider {
  sendText(
    companyId: number,
    to: string,
    message: string,
  ): Promise<string | null>;

  sendTemplate(
    companyId: number,
    to: string,
    templateName: string,
    components: object[],
  ): Promise<string | null>;

  getTemplates?(companyId: number): Promise<any[]>;
}

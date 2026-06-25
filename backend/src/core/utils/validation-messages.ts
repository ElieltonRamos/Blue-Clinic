// src/common/validation-messages.ts
export const ValidationMessages = {
  IS_NOT_EMPTY: (field: string) => `${field} é obrigatório`,
  IS_STRING: (field: string) => `${field} deve ser um texto`,
  IS_EMAIL: () => 'Email deve ser válido',
  IS_NUMBER: (field: string) => `${field} deve ser um número`,
  MIN_LENGTH: (field: string, min: number) =>
    `${field} deve ter no mínimo ${min} caracteres`,
  MAX_LENGTH: (field: string, max: number) =>
    `${field} deve ter no máximo ${max} caracteres`,
  IS_ENUM: (field: string) => `${field} inválido`,
  IS_BOOLEAN: (field: string) => `${field} deve ser verdadeiro ou falso`,
};

export default interface User {
  id?: number;
  username: string;
  password: string;
  workplace: string;
  role?: string;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
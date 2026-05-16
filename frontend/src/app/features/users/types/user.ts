export default interface User {
  id?: string;
  username: string;
  password: string;
  workplace: string;
  role?: string;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
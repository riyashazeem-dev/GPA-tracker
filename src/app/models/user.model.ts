export type UserRole = 'student' | 'admin';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  faculty: string;
  department: string;
  program: string;
  intakeYear: number;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  role: UserRole;
}
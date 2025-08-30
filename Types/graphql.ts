export interface FacebookLoginInput {
  idToken: string;
}

export interface LoginResponse {
  token: string;
  statusText: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user: User | null;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
}

export enum UserRole {
  Sender = 'Sender',
  Admin = 'Admin',
  Moderator = 'Moderator'
}

export interface Context {
  token?: string;
}

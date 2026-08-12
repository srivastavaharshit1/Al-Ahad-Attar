export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  role?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

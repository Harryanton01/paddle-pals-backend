export interface CreateUserDTO {
  email: string;
  password: string;
  username: string;
}

export interface UserResponse {
  id: number;
  email: string;
  username: string;
}

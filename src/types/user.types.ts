export interface CreateUserDTO {
  password: string;
  username: string;
}

export interface UserResponse {
  id: number;
  username: string;
}

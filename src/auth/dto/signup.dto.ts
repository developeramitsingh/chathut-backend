import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SignUpDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['female', 'male', 'other'])
  gender: string;

  @IsOptional()
  @IsString()
  @IsIn(['user', 'partner'])
  role?: string;
}

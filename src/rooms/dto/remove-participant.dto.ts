import { IsNotEmpty, IsString } from 'class-validator';

export class RemoveParticipantDto {
  @IsNotEmpty()
  @IsString()
  userId: string;
}

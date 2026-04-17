import { IsNotEmpty, IsIn, IsString } from 'class-validator';

export class JoinRoomDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['listener', 'femaleSpeaker', 'coSpeaker'])
  role: 'listener' | 'femaleSpeaker' | 'coSpeaker';
}

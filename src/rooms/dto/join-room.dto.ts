import { IsNotEmpty, IsIn, IsString } from 'class-validator';

export class JoinRoomDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['listener', 'femaleSpeaker', 'coSpeaker', 'normalSpeaker'])
  role: 'listener' | 'femaleSpeaker' | 'coSpeaker' | 'normalSpeaker';
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true })
export class Room {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  hostId: string;

  @Prop({ required: true })
  hostName: string;

  @Prop({ required: true })
  hostGender: string;

  @Prop()
  femaleSpeaker?: string;

  @Prop()
  otherSpeaker?: string;

  @Prop({ default: 0 })
  listeners: number;

  @Prop({ default: true })
  isLive: boolean;
}

export const RoomSchema = SchemaFactory.createForClass(Room);

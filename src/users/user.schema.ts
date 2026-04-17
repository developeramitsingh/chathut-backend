import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  gender: string;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ default: 'user' })
  role: string;

  @Prop()
  email?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

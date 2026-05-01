import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CallHistoryDocument = HydratedDocument<CallHistory>;

@Schema({ timestamps: true })
export class CallHistory {
  @Prop({ required: true })
  callerId: string;

  @Prop({ required: true })
  partnerId: string;

  @Prop({ required: true })
  callerName: string;

  @Prop({ required: true })
  partnerName: string;

  @Prop({ required: true })
  startedAt: Date;

  @Prop({ required: true })
  endedAt: Date;

  @Prop({ required: true, min: 1 })
  durationMinutes: number;

  @Prop({ required: true, min: 0 })
  chargedCoins: number;

  @Prop({ required: true, min: 0 })
  creditedCoins: number;
}

export const CallHistorySchema = SchemaFactory.createForClass(CallHistory);

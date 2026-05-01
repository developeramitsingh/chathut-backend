import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CallHistory, CallHistorySchema } from './call-history.schema';
import { User, UserSchema } from './user.schema';
import { UsersController } from './users.controller';
import { UsersGateway } from './users.gateway';
import { UsersService } from './users.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: CallHistory.name, schema: CallHistorySchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersGateway],
  exports: [UsersService],
})
export class UsersModule {}

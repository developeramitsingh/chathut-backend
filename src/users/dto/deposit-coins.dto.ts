import { IsInt, Min } from 'class-validator';

export class DepositCoinsDto {
  @IsInt()
  @Min(1)
  coins: number;
}

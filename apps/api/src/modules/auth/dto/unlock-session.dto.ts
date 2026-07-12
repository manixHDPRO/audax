import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UnlockSessionDto {
  @ApiProperty({ example: 'Audax2026!' })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  totpCode?: string;
}

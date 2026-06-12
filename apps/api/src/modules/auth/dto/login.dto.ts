import { IsEmail, IsString, MinLength, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@audax.fardc.cd' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Audax2026!' })
  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  totpCode?: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class Verify2FADto {
  @IsString()
  tempToken!: string;

  @IsString()
  @Length(6, 6)
  totpCode!: string;
}

export class Enable2FADto {
  @IsString()
  @Length(6, 6)
  totpCode!: string;
}

export class Disable2FADto {
  @IsString()
  @Length(6, 6)
  totpCode!: string;
}

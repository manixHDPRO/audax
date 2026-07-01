import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'nouveau@audax.fardc.cd' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Paul' })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: 'Kabila' })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.SECRETAIRE })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cabinetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bureauId?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Paul' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Kabila' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cabinetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bureauId?: string;
}

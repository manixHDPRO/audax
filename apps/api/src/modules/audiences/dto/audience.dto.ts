import { IsString, IsOptional, IsEnum, IsIn } from 'class-validator';
import { Confidentiality, AudienceCategory, AudienceStatus, ValidationDecision } from '@prisma/client';

export const AUDIENCE_PRIORITIES = ['PRIORITE_0', 'NORMALE', 'URGENTE', 'CRITIQUE'] as const;
export type AudiencePriority = (typeof AUDIENCE_PRIORITIES)[number];

export class CreateAudienceDto {
  @IsString()
  subject!: string;

  @IsString()
  motive!: string;

  @IsString()
  requesterName!: string;

  @IsOptional()
  @IsString()
  requesterOrg?: string;

  @IsOptional()
  @IsIn(AUDIENCE_PRIORITIES)
  priority?: AudiencePriority;

  @IsOptional()
  @IsEnum(Confidentiality)
  confidentiality?: Confidentiality;

  @IsOptional()
  @IsEnum(AudienceCategory)
  category?: AudienceCategory;
}

export class UpdateAudienceDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsEnum(AudienceStatus)
  status?: AudienceStatus;

  @IsOptional()
  @IsIn(AUDIENCE_PRIORITIES)
  priority?: AudiencePriority;
}

export class ValidateAudienceDto {
  @IsEnum(ValidationDecision)
  decision!: ValidationDecision;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  level?: number;
}

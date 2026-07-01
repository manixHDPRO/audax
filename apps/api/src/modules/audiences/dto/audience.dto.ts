import { IsString, IsOptional, IsEnum, IsIn, IsBoolean } from 'class-validator';
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
  @IsString()
  requesterGrade?: string;

  @IsOptional()
  @IsIn(AUDIENCE_PRIORITIES)
  priority?: AudiencePriority;

  @IsOptional()
  @IsEnum(Confidentiality)
  confidentiality?: Confidentiality;

  @IsOptional()
  @IsEnum(AudienceCategory)
  category?: AudienceCategory;

  @IsString()
  visitTargetUserId!: string;

  @IsOptional()
  @IsString()
  visitorId?: string;

  @IsOptional()
  @IsBoolean()
  allowDuplicateToday?: boolean;
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

export class UpdateRequesterGradeDto {
  @IsOptional()
  @IsString()
  requesterGrade?: string;
}

export class CompleteReceptionDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

export class CloseAudienceDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

export class CompleteAccompanimentDto {
  @IsOptional()
  @IsString()
  comment?: string;
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

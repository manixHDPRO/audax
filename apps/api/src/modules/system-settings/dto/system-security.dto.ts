import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, Max, Min } from 'class-validator';
import { INACTIVITY_TIMEOUT_MAX, INACTIVITY_TIMEOUT_MIN } from '../../../common/system-security.constants';

export class UpdateSystemSecurityDto {
  @ApiProperty({ description: 'Activer le verrouillage après inactivité' })
  @IsBoolean()
  inactivityLockEnabled!: boolean;

  @ApiProperty({ example: 15, minimum: INACTIVITY_TIMEOUT_MIN, maximum: INACTIVITY_TIMEOUT_MAX })
  @IsInt()
  @Min(INACTIVITY_TIMEOUT_MIN)
  @Max(INACTIVITY_TIMEOUT_MAX)
  inactivityTimeoutMinutes!: number;
}

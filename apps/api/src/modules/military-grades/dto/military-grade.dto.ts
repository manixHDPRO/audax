import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMilitaryGradeDto {
  @ApiProperty({ example: 'Colonel' })
  @IsString()
  @MinLength(2)
  label!: string;
}

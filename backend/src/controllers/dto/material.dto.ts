import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { MaterialUnit } from '../../types/enums';

export class CreateMaterialDto {
  @ApiProperty({ example: 'HRB400钢筋' })
  @IsString()
  materialName: string;

  @ApiPropertyOptional({ example: 'Φ12' })
  @IsOptional()
  @IsString()
  specification?: string;

  @ApiPropertyOptional({ enum: MaterialUnit, default: MaterialUnit.Ton })
  @IsOptional()
  @IsEnum(MaterialUnit)
  unit?: MaterialUnit;

  @ApiProperty({ example: 4200.5 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;
}

export class StockInDto {
  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ example: 4300 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreateRequisitionDto {
  @ApiProperty({ example: '4d5eb37e-02c2-4d6e-a715-6cdcc6c52361' })
  @IsUUID()
  materialId: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: '主体结构钢筋绑扎' })
  @IsString()
  purpose: string;

  @ApiProperty({ example: '4d5eb37e-02c2-4d6e-a715-6cdcc6c52364' })
  @IsUUID()
  requisitionedBy: string;

  @ApiProperty({ example: '2026-06-12' })
  @IsDateString()
  requisitionedAt: string;

  @ApiPropertyOptional({ example: '4d5eb37e-02c2-4d6e-a715-6cdcc6c52365' })
  @IsOptional()
  @IsUUID()
  costItemId?: string;
}

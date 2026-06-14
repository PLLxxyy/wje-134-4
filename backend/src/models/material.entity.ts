import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { MaterialRequisition } from './materialRequisition.entity';
import { MaterialUnit } from '../types/enums';

@Entity({ name: 'materials' })
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'material_name', type: 'varchar', length: 160 })
  materialName: string;

  @Column({ name: 'specification', type: 'varchar', length: 120, nullable: true })
  specification?: string | null;

  @Column({ type: 'enum', enum: MaterialUnit, default: MaterialUnit.Piece })
  unit: MaterialUnit;

  @Column({ name: 'stock_quantity', type: 'numeric', precision: 14, scale: 2, default: 0 })
  stockQuantity: string;

  @Column({ name: 'unit_price', type: 'numeric', precision: 14, scale: 2 })
  unitPrice: string;

  @OneToMany(() => MaterialRequisition, (requisition) => requisition.material)
  requisitions: MaterialRequisition[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

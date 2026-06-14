import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Material } from './material.entity';
import { MaterialRequisitionStatus } from '../types/enums';

@Entity({ name: 'material_requisitions' })
export class MaterialRequisition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'material_id', type: 'uuid' })
  materialId: string;

  @ManyToOne(() => Material, (material) => material.requisitions)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  quantity: string;

  @Column({ name: 'unit_price', type: 'numeric', precision: 14, scale: 2 })
  unitPrice: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2 })
  totalAmount: string;

  @Column({ name: 'purpose', type: 'varchar', length: 255 })
  purpose: string;

  @Column({ name: 'requisitioned_by', type: 'uuid' })
  requisitionedBy: string;

  @Column({ name: 'requisitioned_at', type: 'date' })
  requisitionedAt: string;

  @Column({ name: 'cost_item_id', type: 'uuid', nullable: true })
  costItemId?: string | null;

  @Column({ type: 'enum', enum: MaterialRequisitionStatus, default: MaterialRequisitionStatus.Pending })
  status: MaterialRequisitionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

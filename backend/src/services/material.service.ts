import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../models/material.entity';
import { MaterialRequisition } from '../models/materialRequisition.entity';
import { CostItem } from '../models/costItem.entity';
import { AuditAction, MaterialRequisitionStatus, MaterialUnit } from '../types/enums';
import { RequestContext } from '../types/interfaces';
import { toMoney } from '../utils/calculator';
import { AuditLogService } from './auditLog.service';

export interface CreateMaterialInput {
  materialName: string;
  specification?: string;
  unit?: MaterialUnit;
  unitPrice: number;
  stockQuantity?: number;
}

export interface StockInInput {
  quantity: number;
  unitPrice?: number;
}

export interface CreateRequisitionInput {
  materialId: string;
  quantity: number;
  purpose: string;
  requisitionedBy: string;
  requisitionedAt: string;
  costItemId?: string;
}

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(MaterialRequisition)
    private readonly requisitionRepository: Repository<MaterialRequisition>,
    @InjectRepository(CostItem)
    private readonly costItemRepository: Repository<CostItem>,
    private readonly auditLogService: AuditLogService
  ) {}

  async listMaterials(): Promise<Material[]> {
    return this.materialRepository.find({ order: { createdAt: 'DESC' } });
  }

  async getMaterialById(id: string): Promise<Material> {
    const material = await this.materialRepository.findOne({ where: { id } });
    if (!material) {
      throw new NotFoundException('材料不存在');
    }
    return material;
  }

  async createMaterial(input: CreateMaterialInput, context: RequestContext): Promise<Material> {
    const material = this.materialRepository.create({
      materialName: input.materialName,
      specification: input.specification ?? null,
      unit: input.unit ?? MaterialUnit.Piece,
      unitPrice: toMoney(input.unitPrice),
      stockQuantity: toMoney(input.stockQuantity ?? 0)
    });

    const saved = await this.materialRepository.save(material);
    await this.writeAudit(AuditAction.MaterialCreated, saved.id, 'Material', context, {
      materialName: saved.materialName,
      stockQuantity: saved.stockQuantity,
      unitPrice: saved.unitPrice
    });
    return saved;
  }

  async stockIn(id: string, input: StockInInput, context: RequestContext): Promise<Material> {
    const material = await this.getMaterialById(id);
    const newQuantity = Number(material.stockQuantity) + input.quantity;
    material.stockQuantity = toMoney(newQuantity);

    if (input.unitPrice !== undefined) {
      material.unitPrice = toMoney(input.unitPrice);
    }

    const saved = await this.materialRepository.save(material);
    await this.writeAudit(AuditAction.MaterialStockedIn, saved.id, 'Material', context, {
      addedQuantity: input.quantity,
      newStockQuantity: saved.stockQuantity
    });
    return saved;
  }

  async listRequisitions(materialId?: string): Promise<MaterialRequisition[]> {
    return this.requisitionRepository.find({
      where: materialId ? { materialId } : {},
      relations: ['material'],
      order: { createdAt: 'DESC' }
    });
  }

  async getRequisitionById(id: string): Promise<MaterialRequisition> {
    const requisition = await this.requisitionRepository.findOne({
      where: { id },
      relations: ['material']
    });
    if (!requisition) {
      throw new NotFoundException('领用记录不存在');
    }
    return requisition;
  }

  async createRequisition(input: CreateRequisitionInput, context: RequestContext): Promise<MaterialRequisition> {
    const material = await this.getMaterialById(input.materialId);

    if (Number(material.stockQuantity) < input.quantity) {
      throw new BadRequestException('库存不足，当前库存 ' + material.stockQuantity + '，申请数量 ' + input.quantity);
    }

    material.stockQuantity = toMoney(Number(material.stockQuantity) - input.quantity);
    await this.materialRepository.save(material);

    const totalAmount = toMoney(Number(material.unitPrice) * input.quantity);

    const requisition = this.requisitionRepository.create({
      materialId: input.materialId,
      quantity: toMoney(input.quantity),
      unitPrice: material.unitPrice,
      totalAmount,
      purpose: input.purpose,
      requisitionedBy: input.requisitionedBy,
      requisitionedAt: input.requisitionedAt,
      costItemId: input.costItemId ?? null,
      status: MaterialRequisitionStatus.Pending
    });

    const saved = await this.requisitionRepository.save(requisition);

    if (input.costItemId) {
      await this.linkRequisitionToCostItem(saved.id, input.costItemId);
    }

    await this.writeAudit(AuditAction.MaterialRequisitionCreated, saved.id, 'MaterialRequisition', context, {
      materialId: input.materialId,
      quantity: saved.quantity,
      totalAmount: saved.totalAmount,
      costItemId: input.costItemId ?? null
    });
    return saved;
  }

  async approveRequisition(id: string, context: RequestContext): Promise<MaterialRequisition> {
    const requisition = await this.getRequisitionById(id);
    if (requisition.status !== MaterialRequisitionStatus.Pending) {
      throw new BadRequestException('只有待审核领用单可以审批');
    }

    requisition.status = MaterialRequisitionStatus.Approved;
    const saved = await this.requisitionRepository.save(requisition);

    await this.writeAudit(AuditAction.MaterialRequisitionApproved, saved.id, 'MaterialRequisition', context, {
      status: saved.status
    });
    return saved;
  }

  async rejectRequisition(id: string, context: RequestContext): Promise<MaterialRequisition> {
    const requisition = await this.getRequisitionById(id);
    if (requisition.status !== MaterialRequisitionStatus.Pending) {
      throw new BadRequestException('只有待审核领用单可以驳回');
    }

    requisition.status = MaterialRequisitionStatus.Rejected;

    const material = await this.getMaterialById(requisition.materialId);
    material.stockQuantity = toMoney(Number(material.stockQuantity) + Number(requisition.quantity));
    await this.materialRepository.save(material);

    const saved = await this.requisitionRepository.save(requisition);

    await this.writeAudit(AuditAction.MaterialRequisitionRejected, saved.id, 'MaterialRequisition', context, {
      status: saved.status,
      returnedQuantity: requisition.quantity
    });
    return saved;
  }

  private async linkRequisitionToCostItem(requisitionId: string, costItemId: string): Promise<void> {
    const costItem = await this.costItemRepository.findOne({ where: { id: costItemId } });
    if (!costItem) {
      return;
    }
    costItem.materialUsageId = requisitionId;
    await this.costItemRepository.save(costItem);
  }

  private async writeAudit(
    action: AuditAction,
    entityId: string,
    entityType: string,
    context: RequestContext,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    await this.auditLogService.write({
      action,
      entityType,
      entityId,
      user: context.user,
      requestId: context.requestId,
      ipAddress: context.ip,
      metadata
    });
  }
}

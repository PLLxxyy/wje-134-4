import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { materialRoutes } from '../routes/material.routes';
import { MaterialService } from '../services/material.service';
import { UserRole } from '../types/enums';
import { RequestContext } from '../types/interfaces';
import { RbacMiddleware, Roles } from '../middlewares/rbac.middleware';
import { ok } from '../utils/response';
import { CreateMaterialDto, CreateRequisitionDto, StockInDto } from './dto/material.dto';

@ApiTags(materialRoutes.tag)
@ApiBearerAuth()
@Controller(materialRoutes.base)
@UseGuards(RbacMiddleware)
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Get()
  @Roles(UserRole.Admin, UserRole.FinanceManager, UserRole.ProjectManager, UserRole.Accountant, UserRole.Viewer)
  @ApiOperation({ summary: '查询材料列表' })
  async listMaterials(@Req() request: Request) {
    return ok(await this.materialService.listMaterials(), '材料列表', request.requestId);
  }

  @Post()
  @Roles(UserRole.Admin, UserRole.ProjectManager, UserRole.Accountant)
  @ApiOperation({ summary: '新建材料（首次入库）' })
  async createMaterial(@Body() body: CreateMaterialDto, @Req() request: Request) {
    return ok(await this.materialService.createMaterial(body, this.context(request)), '材料已创建', request.requestId);
  }

  @Post(materialRoutes.stockIn)
  @Roles(UserRole.Admin, UserRole.ProjectManager, UserRole.Accountant)
  @ApiOperation({ summary: '材料入库，追加库存' })
  async stockIn(@Param('id') id: string, @Body() body: StockInDto, @Req() request: Request) {
    return ok(await this.materialService.stockIn(id, body, this.context(request)), '入库成功', request.requestId);
  }

  @Get(materialRoutes.requisitions)
  @Roles(UserRole.Admin, UserRole.FinanceManager, UserRole.ProjectManager, UserRole.Accountant, UserRole.Viewer)
  @ApiQuery({ name: 'materialId', required: false })
  @ApiOperation({ summary: '查询领用记录列表' })
  async listRequisitions(@Query('materialId') materialId: string | undefined, @Req() request: Request) {
    return ok(await this.materialService.listRequisitions(materialId), '领用记录列表', request.requestId);
  }

  @Post(materialRoutes.requisitions)
  @Roles(UserRole.Admin, UserRole.ProjectManager, UserRole.Accountant)
  @ApiOperation({ summary: '创建领用出库记录，自动扣减库存并可关联成本项' })
  async createRequisition(@Body() body: CreateRequisitionDto, @Req() request: Request) {
    return ok(
      await this.materialService.createRequisition(body, this.context(request)),
      '领用出库已创建',
      request.requestId
    );
  }

  @Post(materialRoutes.approveRequisition)
  @Roles(UserRole.Admin, UserRole.FinanceManager)
  @ApiOperation({ summary: '审批通过领用单' })
  async approveRequisition(@Param('requisitionId') requisitionId: string, @Req() request: Request) {
    return ok(
      await this.materialService.approveRequisition(requisitionId, this.context(request)),
      '领用单已审批通过',
      request.requestId
    );
  }

  @Post(materialRoutes.rejectRequisition)
  @Roles(UserRole.Admin, UserRole.FinanceManager)
  @ApiOperation({ summary: '驳回领用单，库存自动归还' })
  async rejectRequisition(@Param('requisitionId') requisitionId: string, @Req() request: Request) {
    return ok(
      await this.materialService.rejectRequisition(requisitionId, this.context(request)),
      '领用单已驳回',
      request.requestId
    );
  }

  private context(request: Request): RequestContext {
    return {
      requestId: request.requestId ?? '',
      ip: request.ip ?? request.socket.remoteAddress ?? 'unknown',
      user: request.user
    };
  }
}

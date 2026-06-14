export const materialRoutes = {
  tag: '材料管理',
  base: 'materials',
  byId: ':id',
  stockIn: ':id/stock-in',
  requisitions: 'requisitions',
  requisitionById: 'requisitions/:requisitionId',
  approveRequisition: 'requisitions/:requisitionId/approve',
  rejectRequisition: 'requisitions/:requisitionId/reject'
} as const;

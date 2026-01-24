import { AdminLog } from "../models/adminLog.model"

export const logAdminAction = async ({ actionId, action, entityType, entityId, meta = {} }) => {
    await AdminLog.create({
        actionId,
        action,
        entityId,
        entityType,
        meta
    })
}
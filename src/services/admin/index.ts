// Admin service: review queue, seller management, refunds, reports, audit log.
// Every action is logged (who, what, when).
import { isSupabaseLive } from "@/config";
import * as local from "./local";
import * as supa from "./supabase";

const impl = isSupabaseLive ? supa : local;

export const getAdminStats = impl.stats;
export const listPendingListings = impl.listPendingListings;
export const approveListing = impl.approveListing;
export const requestListingChanges = impl.requestChanges;
export const rejectListing = impl.rejectListing;
export const removeListing = impl.removeListing;
export const bulkApproveListings = impl.bulkApprove;
export const listAllUsers = impl.listUsers;
export const listPendingSellers = impl.listPendingSellers;
export const approveSeller = impl.approveSeller;
export const verifySeller = impl.verifySeller;
export const suspendUser = impl.suspendUser;
export const listAllOrders = impl.listAllOrders;
export const refundOrder = impl.refundOrder;
export const listAllCommissions = impl.listAllCommissions;
export const listReports = impl.listReports;
export const resolveReport = impl.resolveReport;
export const listAuditLog = impl.listAudit;
export const subscribeAdmin = impl.subscribeAdmin;

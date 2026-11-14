// Orders service: created after successful payment; sellers fulfil & ship.
import { isSupabaseLive } from "@/config";
import * as local from "./local";
import * as supa from "./supabase";

export type { NewOrderInput } from "./local";

const impl = isSupabaseLive ? supa : local;

export const createOrder = impl.create;
export const listMyOrders = impl.listMine;
export const listMySales = impl.listSales;
export const getOrderById = impl.getById;
export const markOrderShipped = impl.markShipped;
export const markOrderDelivered = impl.markDelivered;
export const subscribeOrders = impl.subscribeOrders;

// Commission flow: request → quote → accept → deposit → WIP → ready → final → delivered.
import { isSupabaseLive } from "@/config";
import * as local from "./local";
import * as supa from "./supabase";

export type { NewCommissionInput } from "./local";

const impl = isSupabaseLive ? supa : local;

export const createCommission = impl.create;
export const listMyCommissions = impl.listMine;
export const listArtistCommissions = impl.listForArtist;
export const getCommissionById = impl.getById;
export const sendCommissionQuote = impl.sendQuote;
export const declineCommission = impl.decline;
export const cancelCommission = impl.cancel;
export const acceptCommissionQuote = impl.accept;
export const payCommissionDeposit = impl.payDeposit;
export const startCommissionWork = impl.startWork;
export const addCommissionWip = impl.addWip;
export const markCommissionReady = impl.markReady;
export const payCommissionFinal = impl.payFinal;
export const markCommissionDelivered = impl.markDelivered;
export const assignCommissionArtist = impl.assignArtist;
export const subscribeCommissions = impl.subscribeCommissions;

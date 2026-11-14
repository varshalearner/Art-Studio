// Real-time chat between buyers and sellers, tied to artworks/orders/commissions.
import { isSupabaseLive } from "@/config";
import * as local from "./local";
import * as supa from "./supabase";

const impl = isSupabaseLive ? supa : local;

export const listThreads = impl.listThreads;
export const getThread = impl.getThread;
export const getOrCreateThread = impl.getOrCreateThread;
export const listMessages = impl.listMessages;
export const sendMessage = impl.send;
export const markThreadRead = impl.markThreadRead;
export const subscribeMessages = impl.subscribeMessages;

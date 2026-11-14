// Notifications service — switches between demo (localStorage) and Supabase.
import { isSupabaseLive } from "@/config";
import * as local from "./local";
import * as supa from "./supabase";

const impl = isSupabaseLive ? supa : local;

export const listNotifications = impl.list;
export const unreadCount = impl.unreadCount;
export const markNotificationRead = impl.markRead;
export const markAllNotificationsRead = impl.markAllRead;
export const subscribeToNotifications = impl.subscribeToNotifications;
/** Internal: other services call this on status changes. */
export const pushNotification = impl.push;

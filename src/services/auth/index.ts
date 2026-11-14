// Auth service — demo (mock login) or Supabase auth, picked by config.
import { isSupabaseLive } from "@/config";
import * as local from "./local";
import * as supa from "./supabase";

const impl = isSupabaseLive ? supa : local;

export const getCurrentUser = impl.getCurrentUser;
export const getUserById = impl.getUserById;
export const signIn = impl.signIn;
export const signUp = impl.signUp;
export const signInWithGoogle = impl.signInWithGoogle;
export const signOut = impl.signOut;
export const loginAsDemo = impl.loginAsDemo as (
  kind: "buyer" | "seller" | "admin"
) => Promise<import("@/types").User>;
export const updateProfile = impl.updateProfile;
export const becomeSeller = impl.becomeSeller;
export const onAuthChange = impl.onAuthChange;

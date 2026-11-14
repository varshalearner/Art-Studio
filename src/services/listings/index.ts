// Seller listings service: create, edit (with re-approval flow), pause, earnings.
import { isSupabaseLive } from "@/config";
import * as local from "./local";
import * as supa from "./supabase";

export type { NewListingInput } from "./local";

const impl = isSupabaseLive ? supa : local;

export const listMyListings = impl.listMine;
export const getListingById = impl.getById;
export const createListing = impl.create;
export const submitListingForReview = impl.submitForReview;
export const updateListing = impl.update;
export const pauseListing = impl.pause;
export const resumeListing = impl.resume;
export const getSellerEarnings = impl.earnings;
export const subscribeMyListings = impl.subscribeMyListings;
export const getSellerStatus = impl.sellerStatus;

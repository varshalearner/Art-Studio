// Public shop service: approved artworks, artists, reviews, wishlist, reports.
import { isSupabaseLive } from "@/config";
import * as local from "./local";
import * as supa from "./supabase";

const impl = isSupabaseLive ? supa : local;

export const listApprovedArtworks = impl.listApproved;
export const getArtworkBySlug = impl.getBySlug;
export const getArtworkById = impl.getById;
export const getFeaturedArtworks = impl.getFeatured;
export const listArtists = impl.listArtists;
export const getArtistByUsername = impl.getArtistByUsername;
export const listArtworksByArtist = impl.listByArtist;
export const listReviews = impl.listReviews;
export const canReview = impl.canReview;
export const addReview = impl.addReview;
export const getWishlist = impl.getWishlist;
export const toggleWishlist = impl.toggleWishlist;
export const reportListing = impl.reportListing;
export const subscribeShop = impl.subscribeShop;

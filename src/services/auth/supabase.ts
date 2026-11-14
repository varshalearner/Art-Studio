import type { User, SellerProfile } from "@/types";
import { getSupabase } from "@/lib/supabase/client";
import { mapUser } from "@/lib/supabase/mappers";
import { slugify, nowIso } from "@/lib/utils";

async function fetchProfile(authUserId: string): Promise<User | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("id", authUserId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapUser(data) : null;
}

export async function getCurrentUser(): Promise<User | null> {
  // getSession() reads the session from local storage (refreshing the token
  // in the background if needed) instead of making a live round-trip to the
  // auth server like getUser() does. getUser() can transiently return no
  // user on a slow/flaky network even with a perfectly valid session,
  // which was flashing a "please log in" state and remounting components
  // (losing in-progress UI state, e.g. an unsent chat draft) on every
  // refresh. getSession() is the resilient choice for "am I logged in?".
  const { data } = await getSupabase().auth.getSession();
  if (!data.session?.user) return null;
  return fetchProfile(data.session.user.id);
}

export async function getUserById(id: string): Promise<User | null> {
  return fetchProfile(id);
}

export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  const profile = await fetchProfile(data.user.id);
  if (!profile) throw new Error("Profile not found — contact support.");
  return profile;
}

export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Check your inbox to confirm your email.");
  // profile row is created by a database trigger; fetch (or wait) for it
  const profile = await fetchProfile(data.user.id);
  return (
    profile ?? {
      id: data.user.id,
      email,
      name,
      avatarUrl: "",
      role: "user",
      isSeller: false,
      language: "en",
      currency: "INR",
      createdAt: nowIso(),
    }
  );
}

export async function signInWithGoogle(): Promise<User | null> {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/account` },
  });
  if (error) throw error;
  return null; // browser redirects away
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}

export async function loginAsDemo(): Promise<User> {
  throw new Error("Demo logins are only available in demo mode.");
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<User, "name" | "avatarUrl" | "language" | "currency">>
): Promise<User> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (patch.language !== undefined) row.language = patch.language;
  if (patch.currency !== undefined) row.currency = patch.currency;
  // the public artist page shows the seller profile's picture: keep it in sync
  if (patch.avatarUrl !== undefined) {
    const { data: current, error: readError } = await getSupabase()
      .from("profiles")
      .select("seller_profile")
      .eq("id", userId)
      .maybeSingle();
    if (readError) throw readError;
    if (current?.seller_profile) {
      row.seller_profile = { ...current.seller_profile, avatarUrl: patch.avatarUrl };
    }
  }
  const { data, error } = await getSupabase()
    .from("profiles")
    .update(row)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return mapUser(data);
}

export async function becomeSeller(
  userId: string,
  profile: Pick<
    SellerProfile,
    "displayName" | "bio" | "country" | "payoutMethod"
  > & { avatarUrl?: string }
): Promise<User> {
  const username = slugify(profile.displayName).replace(/-/g, "");
  const existing = profile.avatarUrl ? null : await fetchProfile(userId);
  const sellerProfile: SellerProfile = {
    displayName: profile.displayName,
    username: username || `artist${userId.slice(0, 4)}`,
    bio: profile.bio,
    country: profile.country,
    avatarUrl: profile.avatarUrl || existing?.avatarUrl || "",
    payoutMethod: profile.payoutMethod,
    verified: false,
    suspended: false,
    status: "pending",
    rating: 0,
    ratingCount: 0,
    createdAt: nowIso(),
  };
  const { data, error } = await getSupabase()
    .from("profiles")
    .update({ is_seller: true, seller_profile: sellerProfile })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return mapUser(data);
}

export function onAuthChange(cb: () => void): () => void {
  // The callback runs while supabase-js holds its auth lock; calling back into
  // Supabase synchronously from here can stall, so defer to the next tick.
  const { data } = getSupabase().auth.onAuthStateChange(() => {
    setTimeout(cb, 0);
  });
  return () => data.subscription.unsubscribe();
}

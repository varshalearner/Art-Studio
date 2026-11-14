import type { User, SellerProfile } from "@/types";
import {
  findById,
  getAll,
  getSessionUserId,
  insert,
  setSessionUserId,
  subscribe,
  subscribeSession,
  updateById,
} from "@/lib/local/db";
import { DEMO_IDS } from "@/lib/demo-data";
import { uid, nowIso, slugify } from "@/lib/utils";

export async function getCurrentUser(): Promise<User | null> {
  const id = getSessionUserId();
  if (!id) return null;
  return findById<User>("users", id) ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  return findById<User>("users", id) ?? null;
}

export async function signIn(email: string, _password: string): Promise<User> {
  const user = getAll<User>("users").find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (!user) {
    throw new Error(
      "No demo account with that email. Try one of the demo logins, or register."
    );
  }
  setSessionUserId(user.id);
  return user;
}

export async function signUp(
  name: string,
  email: string,
  _password: string
): Promise<User> {
  const existing = getAll<User>("users").find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) throw new Error("An account with that email already exists. Log in instead.");
  const user: User = {
    id: uid("u"),
    email,
    name: name || email.split("@")[0],
    avatarUrl: `/avatars/avatar-${1 + (Math.abs(hash(email)) % 8)}.svg`,
    role: "user",
    isSeller: false,
    language: "en",
    currency: "INR",
    createdAt: nowIso(),
  };
  insert("users", user);
  setSessionUserId(user.id);
  return user;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export async function signInWithGoogle(): Promise<User> {
  // In demo mode "Google" just logs in the demo buyer.
  return loginAsDemo("buyer");
}

export async function signOut(): Promise<void> {
  setSessionUserId(null);
}

export async function loginAsDemo(
  kind: "buyer" | "seller" | "admin"
): Promise<User> {
  const id =
    kind === "admin"
      ? DEMO_IDS.admin
      : kind === "seller"
        ? DEMO_IDS.seller
        : DEMO_IDS.buyer;
  const user = findById<User>("users", id);
  if (!user) throw new Error("Demo data missing — try reloading the page.");
  setSessionUserId(id);
  return user;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<User, "name" | "avatarUrl" | "language" | "currency">>
): Promise<User> {
  const existing = findById<User>("users", userId);
  if (!existing) throw new Error("User not found");
  const next: Partial<User> = { ...patch };
  // the public artist page shows the seller profile's picture: keep it in sync
  if (patch.avatarUrl !== undefined && existing.sellerProfile) {
    next.sellerProfile = { ...existing.sellerProfile, avatarUrl: patch.avatarUrl };
  }
  const user = updateById<User>("users", userId, next);
  if (!user) throw new Error("User not found");
  return user;
}

export async function becomeSeller(
  userId: string,
  profile: Pick<
    SellerProfile,
    "displayName" | "bio" | "country" | "payoutMethod"
  > & { avatarUrl?: string }
): Promise<User> {
  const existing = findById<User>("users", userId);
  if (!existing) throw new Error("User not found");
  const username = slugify(profile.displayName).replace(/-/g, "");
  const sellerProfile: SellerProfile = {
    displayName: profile.displayName,
    username: username || `artist${userId.slice(-4)}`,
    bio: profile.bio,
    country: profile.country,
    avatarUrl: profile.avatarUrl || existing.avatarUrl,
    payoutMethod: profile.payoutMethod,
    verified: false,
    suspended: false,
    status: "pending",
    rating: 0,
    ratingCount: 0,
    createdAt: nowIso(),
  };
  const user = updateById<User>("users", userId, {
    isSeller: true,
    sellerProfile,
  });
  return user!;
}

export function onAuthChange(cb: () => void): () => void {
  const a = subscribeSession(cb);
  const b = subscribe("users", cb);
  return () => {
    a();
    b();
  };
}

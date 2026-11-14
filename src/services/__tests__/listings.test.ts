// The approval workflow is the heart of the marketplace — test it end to end
// against the local (demo) implementation. The supabase implementation shares
// the same function signatures, so these tests document the contract.
import { beforeEach, describe, expect, it } from "vitest";
import { __resetForTests } from "@/lib/local/db";
import * as listings from "@/services/listings/local";
import * as admin from "@/services/admin/local";
import * as artworks from "@/services/artworks/local";
import { DEMO_IDS } from "@/lib/demo-data";

const ADMIN = { id: DEMO_IDS.admin, name: "Studio Admin" };

function newListingInput(overrides: Partial<listings.NewListingInput> = {}): listings.NewListingInput {
  return {
    sellerId: DEMO_IDS.seller,
    title: "Test Painting",
    description: "A test painting of a quiet room.",
    category: "painting",
    medium: "oil",
    widthCm: 30,
    heightCm: 40,
    priceInr: 5000,
    kind: "physical",
    images: ["/art/art-01.svg"],
    shipsTo: ["india"],
    shippingRates: [{ region: "india", rateInr: 150 }],
    stock: 1,
    ...overrides,
  };
}

beforeEach(() => {
  __resetForTests();
});

describe("listing approval workflow", () => {
  it("a new listing starts as pending and is NOT publicly visible", async () => {
    const listing = await listings.create(newListingInput());
    expect(listing.status).toBe("pending");

    const shop = await artworks.listApproved();
    expect(shop.find((l) => l.id === listing.id)).toBeUndefined();
  });

  it("a draft stays out of the review queue until submitted", async () => {
    const listing = await listings.create(newListingInput({ asDraft: true }));
    expect(listing.status).toBe("draft");
    const queue = await admin.listPendingListings();
    expect(queue.find((l) => l.id === listing.id)).toBeUndefined();

    await listings.submitForReview(listing.id);
    const queue2 = await admin.listPendingListings();
    expect(queue2.find((l) => l.id === listing.id)).toBeDefined();
  });

  it("admin approval makes the listing publicly visible and records history", async () => {
    const listing = await listings.create(newListingInput());
    const approved = await admin.approveListing(listing.id, ADMIN, "Lovely!");
    expect(approved.status).toBe("approved");

    const shop = await artworks.listApproved();
    expect(shop.find((l) => l.id === listing.id)).toBeDefined();

    const last = approved.statusHistory[approved.statusHistory.length - 1];
    expect(last.status).toBe("approved");
    expect(last.by).toBe(ADMIN.id);
  });

  it("request changes REQUIRES a note and shows it to the seller", async () => {
    const listing = await listings.create(newListingInput());
    await expect(admin.requestChanges(listing.id, "  ", ADMIN)).rejects.toThrow();

    const changed = await admin.requestChanges(listing.id, "Please add a daylight photo", ADMIN);
    expect(changed.status).toBe("changes_requested");
    expect(changed.adminNote).toBe("Please add a daylight photo");
  });

  it("seller fixes a changes_requested listing and it is re-approved", async () => {
    const listing = await listings.create(newListingInput());
    await admin.requestChanges(listing.id, "More photos please", ADMIN);

    await listings.update(listing.id, { description: "Now with daylight photos." });
    const resubmitted = await listings.submitForReview(listing.id);
    expect(resubmitted.status).toBe("pending");

    const approved = await admin.approveListing(listing.id, ADMIN);
    expect(approved.status).toBe("approved");
    expect(approved.description).toBe("Now with daylight photos.");
  });

  it("editing an APPROVED listing keeps the old version live until re-approval", async () => {
    const listing = await listings.create(newListingInput({ title: "Original Title" }));
    await admin.approveListing(listing.id, ADMIN);

    const edited = await listings.update(listing.id, { title: "New Title", priceInr: 9000 });
    // still approved & live with the OLD data
    expect(edited.status).toBe("approved");
    expect(edited.title).toBe("Original Title");
    expect(edited.priceInr).toBe(5000);
    expect(edited.pendingEdit?.title).toBe("New Title");

    // the edit sits in the admin queue
    const queue = await admin.listPendingListings();
    expect(queue.find((l) => l.id === listing.id)).toBeDefined();

    // approving merges the edit
    const approved = await admin.approveListing(listing.id, ADMIN);
    expect(approved.title).toBe("New Title");
    expect(approved.priceInr).toBe(9000);
    expect(approved.pendingEdit).toBeNull();
  });

  it("rejecting an edit keeps the old approved version live", async () => {
    const listing = await listings.create(newListingInput({ title: "Keep Me" }));
    await admin.approveListing(listing.id, ADMIN);
    await listings.update(listing.id, { title: "Bad Edit" });

    const result = await admin.requestChanges(listing.id, "Edit not acceptable", ADMIN);
    expect(result.status).toBe("approved"); // stays live
    expect(result.title).toBe("Keep Me");
    expect(result.pendingEdit).toBeNull();
  });

  it("reject requires a note and hides the listing from the shop", async () => {
    const listing = await listings.create(newListingInput());
    await expect(admin.rejectListing(listing.id, "", ADMIN)).rejects.toThrow();
    const rejected = await admin.rejectListing(listing.id, "Not original work", ADMIN);
    expect(rejected.status).toBe("rejected");
    const shop = await artworks.listApproved();
    expect(shop.find((l) => l.id === listing.id)).toBeUndefined();
  });

  it("bulk approve approves multiple listings", async () => {
    const a = await listings.create(newListingInput({ title: "Bulk A" }));
    const b = await listings.create(newListingInput({ title: "Bulk B" }));
    const count = await admin.bulkApprove([a.id, b.id], ADMIN);
    expect(count).toBe(2);
    expect((await listings.getById(a.id))?.status).toBe("approved");
    expect((await listings.getById(b.id))?.status).toBe("approved");
  });

  it("admin actions are written to the audit log", async () => {
    const listing = await listings.create(newListingInput());
    await admin.approveListing(listing.id, ADMIN);
    const log = await admin.listAudit();
    const entry = log.find((e) => e.targetId === listing.id && e.action === "approve_listing");
    expect(entry).toBeDefined();
    expect(entry?.adminId).toBe(ADMIN.id);
  });
});

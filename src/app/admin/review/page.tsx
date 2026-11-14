import type { Metadata } from "next";
import { ReviewQueue } from "@/components/admin/review-queue";

export const metadata: Metadata = { title: "Review queue" };

export default function AdminReviewPage() {
  return <ReviewQueue />;
}

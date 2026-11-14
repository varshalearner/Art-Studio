import type { Metadata } from "next";
import { CommissionDetail } from "@/components/account/commission-detail";

export const metadata: Metadata = { title: "Commission" };

export default async function CommissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CommissionDetail commissionId={id} />;
}

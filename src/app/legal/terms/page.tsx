import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { siteConfig } from "@/config";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <section>
        <h2>The marketplace</h2>
        <p>
          {siteConfig.name} connects independent artists with buyers. Artists sell their own
          original work; the studio reviews listings, processes payments and takes a platform
          commission ({siteConfig.platformCommissionPercent}% by default) from each sale.
        </p>
      </section>
      <section>
        <h2>Accounts</h2>
        <ul>
          <li>One account lets you buy, sell and commission. You must provide accurate information.</li>
          <li>Selling requires an approved seller profile; the studio may verify, suspend or remove sellers.</li>
        </ul>
      </section>
      <section>
        <h2>Listings &amp; content</h2>
        <ul>
          <li>Only original work you created (or have rights to) may be listed.</li>
          <li>All new listings and edits to live listings require studio approval before publication.</li>
          <li>Copyright stays with the artist; buyers receive the physical piece or a personal-use digital licence unless agreed otherwise.</li>
        </ul>
      </section>
      <section>
        <h2>Commissions</h2>
        <ul>
          <li>A commission starts when the buyer accepts a quote and pays the deposit ({siteConfig.commissionDepositPercent}% by default).</li>
          <li>The remaining balance is due when the artist marks the work ready; delivery follows the final payment.</li>
          <li>Deposits are refundable until work begins; afterwards refunds are at the artist&apos;s and studio&apos;s discretion.</li>
        </ul>
      </section>
      <section>
        <h2>Prohibited</h2>
        <p>Counterfeit or plagiarised work, hateful content, and any misuse of the chat or review systems.</p>
      </section>
    </LegalPage>
  );
}

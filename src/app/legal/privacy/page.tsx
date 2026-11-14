import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { siteConfig } from "@/config";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: name, email, and (for sellers) a public profile with country and payout details.</li>
          <li>Order information: shipping address, purchase history, messages with artists.</li>
          <li>Technical basics: device, approximate region (to suggest a currency), and essential cookies.</li>
          <li>In demo mode, everything is stored only in your own browser&apos;s localStorage.</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To run the marketplace: process orders, deliver commissions, send status notifications.</li>
          <li>To keep the community safe: review listings, investigate reports.</li>
          <li>We never sell your personal data.</li>
        </ul>
      </section>
      <section>
        <h2>Payment data</h2>
        <p>
          Card and UPI details are handled entirely by our payment providers (Razorpay, PayPal)
          and never touch our servers.
        </p>
      </section>
      <section>
        <h2>Your rights (GDPR &amp; similar)</h2>
        <ul>
          <li>Access, correct or delete your data at any time from account settings or by contacting us.</li>
          <li>Export your data on request.</li>
          <li>Withdraw cookie consent via the cookie banner settings.</li>
        </ul>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Privacy questions: hello@amber-easel.example · {siteConfig.name}</p>
      </section>
    </LegalPage>
  );
}

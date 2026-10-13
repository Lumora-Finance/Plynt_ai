import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Lock } from 'lucide-react';

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: 'Privacy Policy — PLYNT' },
      { name: 'description', content: 'Privacy Policy for PLYNT — AI Financial Workspace on Monad.' },
    ],
  }),
  component: PrivacyPage,
});

const EFFECTIVE_DATE = 'October 13, 2026';
const CONTACT_EMAIL = 'privacy@plynt.app';

function PrivacyPage() {
  return (
    <div
      className="relative min-h-screen px-6 py-12"
      style={{ background: '#000000', color: '#FBFAF9' }}
    >
      {/* Subtle grid */}
      <div className="pointer-events-none absolute inset-0 opacity-10" aria-hidden="true"
        style={{
          backgroundImage: 'linear-gradient(to right, #2A2A2E 1px, transparent 1px), linear-gradient(to bottom, #2A2A2E 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl">
        {/* Back link */}
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: '#727285', fontFamily: 'var(--font-mono)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#8270FF'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#727285'; }}
        >
          <ArrowLeft className="size-4" />
          Back to PLYNT
        </Link>

        {/* Header */}
        <div className="mb-10 flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full" style={{ background: '#8270FF1A' }}>
            <Lock className="size-6" style={{ color: '#8270FF' }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Sancreek', serif" }}>
              Privacy Policy
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#727285', fontFamily: 'var(--font-mono)' }}>
              Effective date: {EFFECTIVE_DATE}
            </p>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: '#C7C7D6' }}>

          {/* Intro */}
          <section>
            <p>
              Lumora Finance ("we", "us", "our") operates PLYNT ("the Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use PLYNT. Please read this carefully. If you disagree with the terms of this policy, please discontinue use of the Service.
            </p>
          </section>

          {/* 1 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>1. Information We Collect</h2>

            <h3 className="mb-2 text-sm font-semibold" style={{ color: '#FBFAF9' }}>1.1 Information you provide</h3>
            <ul className="mb-4 space-y-1.5 pl-5" style={{ listStyleType: 'disc' }}>
              <li><strong style={{ color: '#FBFAF9' }}>Email address</strong> — collected when you sign in via email OTP</li>
              <li><strong style={{ color: '#FBFAF9' }}>Google account name and email</strong> — collected when you sign in via Google OAuth</li>
              <li><strong style={{ color: '#FBFAF9' }}>Display name</strong> — set in your profile settings</li>
              <li><strong style={{ color: '#FBFAF9' }}>Invoice data</strong> — client names, emails, amounts, and line items you enter</li>
              <li><strong style={{ color: '#FBFAF9' }}>Gift and salary data</strong> — recipient names, addresses, amounts you configure</li>
            </ul>

            <h3 className="mb-2 text-sm font-semibold" style={{ color: '#FBFAF9' }}>1.2 Information collected automatically</h3>
            <ul className="space-y-1.5 pl-5" style={{ listStyleType: 'disc' }}>
              <li><strong style={{ color: '#FBFAF9' }}>Wallet address</strong> — your Monad embedded wallet address, derived from your Privy session</li>
              <li><strong style={{ color: '#FBFAF9' }}>On-chain data</strong> — transaction history, balances, and token transfers read directly from the Monad blockchain (public data)</li>
              <li><strong style={{ color: '#FBFAF9' }}>Usage data</strong> — pages visited, features used, timestamps</li>
              <li><strong style={{ color: '#FBFAF9' }}>Device information</strong> — browser type, operating system, IP address</li>
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="mt-3 space-y-1.5 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Provide, operate, and improve the Service</li>
              <li>Create and manage your account and embedded wallet</li>
              <li>Display your financial data, balances, and transaction history</li>
              <li>Process and display invoices, gifts, and salary configurations</li>
              <li>Power the AI assistant with your wallet context</li>
              <li>Send transactional notifications (invoice paid, payment received)</li>
              <li>Comply with legal obligations</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
            <p className="mt-3">
              We do <strong style={{ color: '#FBFAF9' }}>not</strong> sell your personal data to third parties. We do not use your data for advertising purposes.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>3. Authentication and Wallet Infrastructure</h2>
            <p>
              Authentication and embedded wallet management are handled by <strong style={{ color: '#FBFAF9' }}>Privy</strong> (privy.io). When you sign in, Privy processes your credentials and creates a secure embedded wallet. Key points:
            </p>
            <ul className="mt-3 space-y-1.5 pl-5" style={{ listStyleType: 'disc' }}>
              <li>PLYNT never has access to your private key — it is managed exclusively by Privy's secure enclave</li>
              <li>Privy's data practices are governed by Privy's own Privacy Policy at <a href="https://privy.io/privacy" target="_blank" rel="noreferrer" style={{ color: '#8270FF' }}>privy.io/privacy</a></li>
              <li>Your Privy DID (decentralized identity) is stored in our database to associate your profile with your data</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>4. Database and Storage</h2>
            <p>
              Your profile data, invoices, gifts, salary configurations, and notifications are stored in <strong style={{ color: '#FBFAF9' }}>Supabase</strong> (supabase.com), a hosted PostgreSQL database. Data is stored with:
            </p>
            <ul className="mt-3 space-y-1.5 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Row-Level Security (RLS) policies ensuring you can only access your own data</li>
              <li>Encryption at rest and in transit</li>
              <li>Supabase's data practices are governed by their Privacy Policy at <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer" style={{ color: '#8270FF' }}>supabase.com/privacy</a></li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>5. Blockchain Data</h2>
            <p>
              Blockchain transactions and wallet balances on Monad are <strong style={{ color: '#FBFAF9' }}>public by nature</strong>. Any transaction you broadcast to the Monad network is permanently visible on-chain and cannot be deleted. PLYNT reads this public data to display your financial activity — we do not store raw blockchain data in our database beyond what you explicitly create through the app.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>6. AI Assistant</h2>
            <p>
              The PLYNT AI assistant processes your wallet data (balances, transaction history) to generate responses. Queries to the AI assistant may be processed by third-party AI model providers. We do not use your financial data to train AI models without your explicit consent.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>7. Data Sharing</h2>
            <p>We may share your information with:</p>
            <ul className="mt-3 space-y-1.5 pl-5" style={{ listStyleType: 'disc' }}>
              <li><strong style={{ color: '#FBFAF9' }}>Service providers</strong> — Privy (auth/wallet), Supabase (database), hosting providers — only to the extent necessary to operate the Service</li>
              <li><strong style={{ color: '#FBFAF9' }}>Legal requirements</strong> — if required by law, court order, or governmental authority</li>
              <li><strong style={{ color: '#FBFAF9' }}>Business transfers</strong> — in connection with a merger, acquisition, or sale of assets</li>
            </ul>
            <p className="mt-3">We do not share your data with advertisers, data brokers, or analytics companies.</p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>8. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time by contacting us. Note that on-chain transactions cannot be deleted as they are part of the immutable Monad blockchain.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>9. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="mt-3 space-y-1.5 pl-5" style={{ listStyleType: 'disc' }}>
              <li><strong style={{ color: '#FBFAF9' }}>Access</strong> — request a copy of your personal data</li>
              <li><strong style={{ color: '#FBFAF9' }}>Correction</strong> — request correction of inaccurate data</li>
              <li><strong style={{ color: '#FBFAF9' }}>Deletion</strong> — request deletion of your account and off-chain data</li>
              <li><strong style={{ color: '#FBFAF9' }}>Portability</strong> — request your data in a portable format</li>
              <li><strong style={{ color: '#FBFAF9' }}>Objection</strong> — object to certain processing of your data</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#8270FF' }}>{CONTACT_EMAIL}</a>.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>10. Security</h2>
            <p>
              We implement industry-standard security measures including TLS encryption, database RLS policies, and secure key management via Privy. However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security of your data.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>11. Children's Privacy</h2>
            <p>
              The Service is not directed to individuals under 18 years of age. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal data, please contact us and we will take steps to delete such information.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by updating the effective date at the top of this page. We encourage you to review this page periodically.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>13. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy or our data practices, contact us at:{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                style={{ color: '#8270FF' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6" style={{ borderColor: '#26262B' }}>
          <Link to="/terms" className="text-xs transition-colors" style={{ color: '#727285', fontFamily: 'var(--font-mono)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#8270FF'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#727285'; }}
          >
            ← Terms of Service
          </Link>
          <Link to="/" className="text-xs transition-colors" style={{ color: '#727285', fontFamily: 'var(--font-mono)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#8270FF'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#727285'; }}
          >
            Back to PLYNT →
          </Link>
        </div>
      </div>
    </div>
  );
}

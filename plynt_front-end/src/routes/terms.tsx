import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Shield } from 'lucide-react';

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title: 'Terms of Service — PLYNT' },
      { name: 'description', content: 'Terms of Service for PLYNT — AI Financial Workspace on Monad.' },
    ],
  }),
  component: TermsPage,
});

const EFFECTIVE_DATE = 'October 13, 2026';
const CONTACT_EMAIL = 'legal@plynt.app';

function TermsPage() {
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
            <Shield className="size-6" style={{ color: '#8270FF' }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Sancreek', serif" }}>
              Terms of Service
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#727285', fontFamily: 'var(--font-mono)' }}>
              Effective date: {EFFECTIVE_DATE}
            </p>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: '#C7C7D6' }}>

          {/* 1 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>1. Acceptance of Terms</h2>
            <p>
              By accessing or using PLYNT ("the Service", "we", "our"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These Terms apply to all visitors, users, and others who access or use PLYNT.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>2. Description of Service</h2>
            <p>
              PLYNT is an AI-powered financial workspace built on the Monad blockchain. The Service provides:
            </p>
            <ul className="mt-3 space-y-1.5 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Embedded EVM wallet creation and management via Privy</li>
              <li>Real-time MON and token balance tracking on Monad Testnet</li>
              <li>On-chain transaction sending and receiving</li>
              <li>Invoice creation, management, and payment links</li>
              <li>Programmable time-locked gifts</li>
              <li>Salary tracking and distribution rules</li>
              <li>AI-powered financial assistant</li>
            </ul>
            <p className="mt-3">
              The Service currently operates on <strong style={{ color: '#FBFAF9' }}>Monad Testnet</strong>. Testnet tokens have no real monetary value. Mainnet support is forthcoming.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>3. Eligibility</h2>
            <p>
              You must be at least 18 years old and capable of forming a binding contract to use the Service. By using PLYNT you represent that you meet these requirements and that you are not prohibited from using the Service under applicable law.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>4. Accounts and Authentication</h2>
            <p>
              Authentication is handled entirely by <strong style={{ color: '#FBFAF9' }}>Privy</strong>, a third-party identity and wallet provider. PLYNT does not store your passwords or private keys. You are responsible for:
            </p>
            <ul className="mt-3 space-y-1.5 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Maintaining the security of your sign-in credentials (email or Google account)</li>
              <li>Any activity that occurs under your account</li>
              <li>Immediately notifying us of any unauthorized use</li>
            </ul>
            <p className="mt-3">
              Your embedded wallet private key is managed by Privy's secure enclave infrastructure. We never have access to your private key.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>5. Blockchain Transactions</h2>
            <p>
              Blockchain transactions are <strong style={{ color: '#FBFAF9' }}>irreversible</strong>. Once a transaction is broadcast to the Monad network, it cannot be cancelled, reversed, or modified. You acknowledge:
            </p>
            <ul className="mt-3 space-y-1.5 pl-5" style={{ listStyleType: 'disc' }}>
              <li>You are solely responsible for verifying transaction details before confirming</li>
              <li>Network fees (gas) are non-refundable regardless of transaction outcome</li>
              <li>Smart contract interactions carry inherent risks</li>
              <li>PLYNT is not liable for any losses arising from on-chain transactions</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>6. Prohibited Uses</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="mt-3 space-y-1.5 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Violate any applicable law or regulation</li>
              <li>Conduct money laundering, fraud, or other financial crimes</li>
              <li>Circumvent sanctions or export controls</li>
              <li>Transmit malware, viruses, or other harmful code</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Engage in market manipulation or deceptive trading practices</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>7. AI Assistant</h2>
            <p>
              PLYNT's AI assistant provides informational responses based on your wallet data. AI-generated content:
            </p>
            <ul className="mt-3 space-y-1.5 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Does not constitute financial, legal, or investment advice</li>
              <li>May contain errors or inaccuracies</li>
              <li>Should not be the sole basis for financial decisions</li>
            </ul>
            <p className="mt-3">
              Always conduct your own due diligence before making financial decisions.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>8. Intellectual Property</h2>
            <p>
              The Service and all related content, features, and functionality (including but not limited to the PLYNT name, logo, design, and code) are owned by Lumora Finance and protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>9. Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>
            <p className="mt-3">
              PLYNT is currently in <strong style={{ color: '#FBFAF9' }}>testnet mode</strong>. Use for educational and development purposes only. Do not use the Service with real monetary value until mainnet launch.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, LUMORA FINANCE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE OR ANY BLOCKCHAIN TRANSACTIONS, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>11. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of material changes by updating the effective date above. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>12. Governing Law</h2>
            <p>
              These Terms are governed by the laws applicable to Lumora Finance's place of incorporation, without regard to conflict of law provisions. Any disputes shall be resolved through binding arbitration.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#FBFAF9' }}>13. Contact</h2>
            <p>
              Questions about these Terms? Contact us at{' '}
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
          <Link to="/" className="text-xs transition-colors" style={{ color: '#727285', fontFamily: 'var(--font-mono)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#8270FF'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#727285'; }}
          >
            ← Back to PLYNT
          </Link>
          <Link to="/privacy" className="text-xs transition-colors" style={{ color: '#727285', fontFamily: 'var(--font-mono)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#8270FF'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#727285'; }}
          >
            Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}

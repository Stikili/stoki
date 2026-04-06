export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12" style={{ color: 'var(--foreground)' }}>
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Last updated: April 2026</p>

      <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
        <section>
          <h2 className="font-bold text-lg mb-2">What we collect</h2>
          <p>Stoki collects the minimum data needed to run your business tools: your email or phone number for authentication, store name, product catalogue, sales records, credit book entries, and expenses. We do not collect data unrelated to your use of the app.</p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">How we use your data</h2>
          <p>Your data is used solely to provide the Stoki service — inventory management, sales tracking, credit book, AI business insights, and notifications. We do not sell, rent, or share your data with third parties for marketing purposes.</p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">AI Insights</h2>
          <p>When you use Stoki Insight, your store data (product names, sales summaries, debtor totals) is sent to our AI provider (Anthropic) to generate business advice. This data is not stored by the AI provider and is not used to train AI models.</p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">Data storage</h2>
          <p>Your data is stored securely on Supabase (hosted on AWS) with row-level security ensuring only you can access your own store data. All connections are encrypted via TLS.</p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">Your rights</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Access:</strong> You can export all your data at any time from Settings.</li>
            <li><strong>Deletion:</strong> You can permanently delete your account and all associated data from Settings. This action is irreversible.</li>
            <li><strong>Portability:</strong> Use the data export feature to download a full JSON backup of your store.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">Cookies &amp; local storage</h2>
          <p>Stoki uses cookies for authentication sessions and localStorage for preferences (theme, language, advisor chat history). No tracking cookies are used.</p>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-2">Contact</h2>
          <p>For privacy concerns, contact us at <a href="mailto:hello@stoki.app" className="text-brand underline">hello@stoki.app</a>.</p>
        </section>
      </div>

      <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--card-border)' }}>
        <a href="/login" className="text-brand text-sm font-semibold">← Back to sign in</a>
      </div>
    </div>
  )
}

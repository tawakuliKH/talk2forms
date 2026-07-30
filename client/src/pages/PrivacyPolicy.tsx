export default function PrivacyPolicy() {
  return (
    <div className="gg-page">
      <div className="gg-container">
        <div className="gg-logo">
          Talk2Forms<span>.</span>
        </div>
        <h1 className="gg-title">Privacy Policy</h1>
        <p className="gg-subtitle">Last updated: July 2026</p>

        <div className="gg-step">
          <div className="gg-step-body" style={{ maxWidth: "68ch" }}>
            <h2>What Talk2Forms is</h2>
            <p>
              Talk2Forms is a website and browser extension that helps you fill out online
              forms by voice. This policy explains what information we collect, how it's
              used, and the choices you have.
            </p>

            <h2>Information we collect</h2>
            <p>
              <strong>Account information:</strong> your email address, and a securely
              hashed password if you sign up with email/password (we never store your
              actual password — only a one-way cryptographic hash). If you sign in with
              Google, we receive your name and email from Google.
            </p>
            <p>
              <strong>Profile information you provide:</strong> your name, WhatsApp
              number, LinkedIn/portfolio/GitHub links, and any CV or background text you
              paste in. This is used only to help fill out forms on your behalf, and to
              generate an AI summary of your background for your own reference.
            </p>
            <p>
              <strong>Your Gemini API key:</strong> if you connect your own Google Gemini
              API key, it's stored so the extension can use it on your behalf. It is
              never shared with other users or used for anything other than your own
              requests.
            </p>
            <p>
              <strong>Form-filling data:</strong> when you scan a page with the extension,
              the page's visible text and field labels are sent to our server and then to
              Google's Gemini AI, along with your profile, to determine what should be
              filled in. Voice recordings are processed locally by your browser's speech
              recognition — the resulting text (not audio) is sent to Gemini to generate a
              clean answer.
            </p>

            <h2>How we use your information</h2>
            <p>
              We use your information solely to operate Talk2Forms: authenticating you,
              matching your profile to form fields, generating AI answers, and sending
              you account-related emails (welcome messages and profile-update
              confirmations). We do not sell your data, and we do not share it with
              advertisers.
            </p>

            <h2>Third parties we use</h2>
            <p>
              <strong>Google Gemini API</strong> processes form and profile data to
              generate answers, governed by{" "}
              <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">
                Google's Gemini API terms
              </a>
              . <strong>Resend</strong> sends transactional emails on our behalf (welcome
              and profile-update emails). <strong>Google Sign-In</strong> is used if you
              choose to authenticate with your Google account.
            </p>

            <h2>Data storage and security</h2>
            <p>
              Your data is stored on servers we operate directly. Passwords are hashed
              with bcrypt and never stored in plain text. Sessions are managed with
              secure, httpOnly cookies.
            </p>

            <h2>Your choices</h2>
            <p>
              You can edit or delete your profile information at any time from your
              Dashboard. To delete your account entirely, contact us at the email below
              and we will remove your data.
            </p>

            <h2>Children's privacy</h2>
            <p>Talk2Forms is not directed at children under 13, and we do not knowingly collect data from them.</p>

            <h2>Changes to this policy</h2>
            <p>We may update this policy from time to time. Material changes will be reflected by an updated "last updated" date above.</p>

            <h2>Contact</h2>
            <p>
              Questions about this policy? Email us at{" "}
              <a href="mailto:privacy@talk2forms.site">privacy@talk2forms.site</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function GeminiKeyGuide() {
  return (
    <div className="gg-page">
      <div className="gg-container">
        <div className="gg-logo">
          Talk2Forms<span>.</span>
        </div>
        <h1 className="gg-title">How to get your free Gemini API key</h1>
        <p className="gg-subtitle">
          Takes about a minute. Your key is free, tied to your own Google account, and stays
          private to you — Talk2Forms never shares it.
        </p>

        <div className="gg-step">
          <div className="gg-step-number">1</div>
          <div className="gg-step-body">
            <h2>Open Google AI Studio and create a key</h2>
            <p>
              Go to{" "}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/app/apikey
              </a>
              , sign in with any Google account, and click <strong>"Create API key."</strong>
            </p>
            <img src="/guide/step1-create-key-button.png" alt="Create API key button in Google AI Studio" className="gg-image" />
          </div>
        </div>

        <div className="gg-step">
          <div className="gg-step-number">2</div>
          <div className="gg-step-body">
            <h2>Name it "talk2forms"</h2>
            <p>
              When prompted to name your key, enter <strong>talk2forms</strong> so you can
              recognize it later, then click <strong>Create key</strong>.
            </p>
            <img src="/guide/step2-name-your-key.png" alt="Naming the API key talk2forms" className="gg-image" />
          </div>
        </div>

        <div className="gg-step">
          <div className="gg-step-number">3</div>
          <div className="gg-step-body">
            <h2>Copy the key</h2>
            <p>
              Click the copy icon next to your new API key. It's a long string starting with{" "}
              <code>AQ.</code> or <code>AIza</code>.
            </p>
            <img src="/guide/step3-copy-key.png" alt="Copying the generated API key" className="gg-image" />
          </div>
        </div>

        <div className="gg-step">
          <div className="gg-step-number">4</div>
          <div className="gg-step-body">
            <h2>Paste it into your Talk2Forms profile</h2>
            <p>Go back to your Dashboard → Profile → paste the key into the "Gemini API key" field → Save.</p>
          </div>
        </div>

        <div className="gg-links">
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="gg-btn">
            Open Google AI Studio
          </a>
          <a
            href="https://ai.google.dev/gemini-api/docs/api-key"
            target="_blank"
            rel="noreferrer"
            className="gg-btn gg-btn-secondary"
          >
            Read Google's official docs
          </a>
        </div>
      </div>
    </div>
  );
}

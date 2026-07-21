import { Link } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

interface Props {
  session?: Session | null;
}

export default function Landing({ session }: Props) {
  const loggedIn = Boolean(session);

  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-logo">
            Talk2Forms<span className="lp-logo-dot">.</span>
          </div>
          <nav className="lp-nav">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#privacy">Your data</a>
          </nav>
          <div className="lp-header-actions">
            {loggedIn ? (
              <Link to="/dashboard" className="lp-btn lp-btn-solid">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="lp-btn lp-btn-ghost">
                  Sign in
                </Link>
                <Link to="/signup" className="lp-btn lp-btn-solid">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow">A browser extension for job applications</p>
            <h1 className="lp-h1">
              Stop retyping your life story on every application.
            </h1>
            <p className="lp-hero-sub">
              Fill out your profile once. Talk2Forms reads any job application
              form, finds what's missing, and asks you — out loud — instead of
              making you copy-paste the same answers for the hundredth time.
            </p>
            <div className="lp-hero-actions">
              {loggedIn ? (
                <Link to="/dashboard" className="lp-btn lp-btn-solid lp-btn-lg">
                  Go to your dashboard
                </Link>
              ) : (
                <Link to="/signup" className="lp-btn lp-btn-solid lp-btn-lg">
                  Get started free
                </Link>
              )}
              <a href="#how" className="lp-btn lp-btn-text">
                See how it works ↓
              </a>
            </div>
            <p className="lp-hero-trust">
              Bring your own Gemini API key — your data and your AI usage
              stay yours, always.
            </p>
          </div>

          <div className="lp-hero-visual" aria-hidden="true">
            <div className="lp-mock-window">
              <div className="lp-mock-titlebar">
                <span className="lp-mock-dot" />
                <span className="lp-mock-dot" />
                <span className="lp-mock-dot" />
                <span className="lp-mock-url">careers.acmeco.com/apply</span>
              </div>
              <div className="lp-mock-body">
                <div className="lp-mock-field">
                  <label>Full name</label>
                  <div className="lp-mock-input lp-filled">Khadim Tawakuli</div>
                </div>
                <div className="lp-mock-field">
                  <label>
                    Portfolio URL <span className="lp-tab lp-tab-yellow">missing</span>
                  </label>
                  <div className="lp-mock-input lp-empty" />
                </div>
                <div className="lp-mock-field">
                  <label>
                    Why do you want this role? <span className="lp-tab lp-tab-yellow">missing</span>
                  </label>
                  <div className="lp-mock-input lp-empty lp-tall" />
                </div>
              </div>
              <div className="lp-mock-chat">
                <div className="lp-mock-avatar">T2F</div>
                <div className="lp-mock-bubble">
                  Two fields are missing — mind telling me about your portfolio
                  and why this role interests you?
                  <span className="lp-caret" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section" id="how">
          <p className="lp-eyebrow lp-eyebrow-center">How it works</p>
          <h2 className="lp-h2 lp-h2-center">Three tabs in your folder.</h2>

          <div className="lp-folder">
            <div className="lp-tab-card">
              <span className="lp-tab-label">Tab A</span>
              <h3>Fill your profile once</h3>
              <p>
                Name, contact info, links, and your CV — paste it in, and
                Talk2Forms quietly builds an AI-ready summary in the
                background.
              </p>
            </div>
            <div className="lp-tab-card lp-tab-card-raised">
              <span className="lp-tab-label">Tab B</span>
              <h3>Open any application form</h3>
              <p>
                Click "Scan page." Talk2Forms reads every field and label,
                then checks it against what it knows about you — silently,
                nothing gets filled yet.
              </p>
            </div>
            <div className="lp-tab-card">
              <span className="lp-tab-label">Tab C</span>
              <h3>Just talk</h3>
              <p>
                Start the AI interview. Say what's missing out loud, in your
                own words — Talk2Forms writes the answers into the right
                fields for you.
              </p>
            </div>
          </div>
        </section>

        <section className="lp-section" id="features">
          <p className="lp-eyebrow lp-eyebrow-center">Built for the job hunt</p>
          <h2 className="lp-h2 lp-h2-center">
            Less form-filling. More applying.
          </h2>

          <div className="lp-grid">
            <div className="lp-feature">
              <span className="lp-feature-mark" />
              <h3>Scan &amp; highlight</h3>
              <p>
                See exactly which fields on a page are missing information
                before you commit to filling anything in.
              </p>
            </div>
            <div className="lp-feature">
              <span className="lp-feature-mark" />
              <h3>Voice-first interview</h3>
              <p>
                Talk2Forms explains the form, asks about gaps, and writes
                your spoken answers straight into the right fields.
              </p>
            </div>
            <div className="lp-feature">
              <span className="lp-feature-mark" />
              <h3>Works without an account</h3>
              <p>
                No profile yet? Talk2Forms still helps with a lighter, one-time
                pass — then invites you to save your info for next time.
              </p>
            </div>
            <div className="lp-feature">
              <span className="lp-feature-mark" />
              <h3 id="privacy">Your key, your data</h3>
              <p>
                Every user connects their own free Gemini API key. Your
                information is never run through a shared account.
              </p>
            </div>
          </div>
        </section>

        <section className="lp-cta">
          <h2 className="lp-h2">Your next application shouldn't take an hour.</h2>
          {loggedIn ? (
            <Link to="/dashboard" className="lp-btn lp-btn-solid lp-btn-lg">
              Go to your dashboard
            </Link>
          ) : (
            <Link to="/signup" className="lp-btn lp-btn-solid lp-btn-lg">
              Get started free
            </Link>
          )}
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-logo">
          Talk2Forms<span className="lp-logo-dot">.</span>
        </div>
        <p>Built for job seekers who'd rather talk than type.</p>
      </footer>
    </div>
  );
}
import { Link } from "react-router-dom";
import type { Session } from "../lib/supabaseClient";

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
            <a href="#accessibility">Accessibility</a>
            <a href="#features">Features</a>
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
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow">A free browser extension</p>
            <h1 className="lp-h1">
              Fill the forms with a click. Talk to forms and fill in a minute.
            </h1>
            <p className="lp-hero-sub">
              Any form, on any site. Talk2Forms scans the page, tells you what it already
              knows about you, and asks about the rest — out loud. You talk, it fills.
              No more retyping your name, number, and story for the hundredth time.
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
              <strong>Speak in any language — Talk2Forms detects it automatically.</strong> Built
              for speed, and for anyone who finds typing slow, tiring, or hard — bring your own
              free Gemini key, your data stays yours.
            </p>
          </div>

          <div className="lp-hero-visual" aria-hidden="true">
            <div className="lp-mock-window">
              <div className="lp-mock-titlebar">
                <span className="lp-mock-dot" />
                <span className="lp-mock-dot" />
                <span className="lp-mock-dot" />
                <span className="lp-mock-url">any-website.com/form</span>
              </div>
              <div className="lp-mock-body">
                <div className="lp-mock-field">
                  <label>Full name</label>
                  <div className="lp-mock-input lp-filled">Khadim Tawakuli</div>
                </div>
                <div className="lp-mock-field">
                  <label>
                    Delivery address <span className="lp-tab lp-tab-yellow">missing</span>
                  </label>
                  <div className="lp-mock-input lp-empty" />
                </div>
                <div className="lp-mock-field">
                  <label>
                    Tell us more <span className="lp-tab lp-tab-yellow">missing</span>
                  </label>
                  <div className="lp-mock-input lp-empty lp-tall" />
                </div>
              </div>
              <div className="lp-mock-chat">
                <div className="lp-mock-avatar">T2F</div>
                <div className="lp-mock-bubble">
                  Two things are missing — just talk to me and I'll fill them in.
                  <span className="lp-caret" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="lp-section" id="how">
          <p className="lp-eyebrow lp-eyebrow-center">How it works</p>
          <h2 className="lp-h2 lp-h2-center">Three tabs in your folder.</h2>

          <div className="lp-folder">
            <div className="lp-tab-card">
              <span className="lp-tab-label">Tab A</span>
              <h3>Tell it about you, once</h3>
              <p>
                Fill your profile once — name, contact info, links, and a bit about you.
                Talk2Forms remembers it for every form after that.
              </p>
            </div>
            <div className="lp-tab-card lp-tab-card-raised">
              <span className="lp-tab-label">Tab B</span>
              <h3>Open any form and scan</h3>
              <p>
                One click reads every field on the page and checks it against what it
                knows about you — nothing gets touched yet, you see it first.
              </p>
            </div>
            <div className="lp-tab-card">
              <span className="lp-tab-label">Tab C</span>
              <h3>Just talk</h3>
              <p>
                Press record, say your answer in your own words, and Talk2Forms writes it
                into the right field — clean, correct, and editable before it's final.
              </p>
            </div>
          </div>
        </section>

        {/* ACCESSIBILITY */}
        <section className="lp-section" id="accessibility">
          <div className="lp-access-card">
            <p className="lp-eyebrow">Built to include everyone</p>
            <h2 className="lp-h2">Not everyone can type through a long form. Now they don't have to.</h2>
            <p className="lp-access-body">
              Talk2Forms was built so that anyone who finds typing slow, tiring, or
              impossible — including people with limited vision or limited use of their
              hands — can fill out a form entirely by voice: scan, listen, talk, confirm.
              Every field stays editable, every answer is read back before it's used, and
              nothing is filled without a clear, spoken confirmation first.
            </p>
          </div>
        </section>

        {/* FEATURES */}
        <section className="lp-section" id="features">
          <p className="lp-eyebrow lp-eyebrow-center">Works everywhere</p>
          <h2 className="lp-h2 lp-h2-center">
            Job applications, signups, surveys, checkout — any form.
          </h2>

          <div className="lp-grid">
            <div className="lp-feature">
              <span className="lp-feature-mark" />
              <h3>Scan &amp; understand</h3>
              <p>
                Reads every field type — text, dropdowns, checkboxes, dates, file uploads —
                and figures out what each one is actually asking.
              </p>
            </div>
            <div className="lp-feature">
              <span className="lp-feature-mark" />
              <h3>Voice-first, hands optional</h3>
              <p>
                Record, review, and re-record your answer as many times as you like before
                anything is written into the page.
              </p>
            </div>
            <div className="lp-feature">
              <span className="lp-feature-mark" />
              <h3>Learns as you go</h3>
              <p>
                Answers you confirm are saved back to your profile, so the next form
                you fill needs even less from you.
              </p>
            </div>
            <div className="lp-feature">
              <span className="lp-feature-mark" />
              <h3>Any language, auto-detected</h3>
              <p>
                Speak in English, Spanish, Persian, Pashto, or any of 99+ languages —
                Talk2Forms automatically detects what you're speaking, no settings to change.
              </p>
            </div>
            <div className="lp-feature">
              <span className="lp-feature-mark" />
              <h3>Your key, your data</h3>
              <p>
                Connect your own free Gemini API key. Your information is never run
                through a shared account.
              </p>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="lp-cta">
          <h2 className="lp-h2">Stop typing the same thing twice.</h2>
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
        <p>Fill the forms with a click. Talk to forms and fill in a minute.</p>
        <p style={{ marginTop: 8 }}>
          <Link to="/privacy" style={{ color: "inherit" }}>Privacy Policy</Link>
        </p>
      </footer>
    </div>
  );
}


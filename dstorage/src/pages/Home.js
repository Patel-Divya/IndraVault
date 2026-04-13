import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MagneticButton from '../components/MagneticButton';
import { RevealSection } from '../components/ScrollReveal';

// ── Counter animation ────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el  = ref.current;
    if (!el || isNaN(target)) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      let curr  = 0;
      const step = target / 45;
      const iv   = setInterval(() => {
        curr = Math.min(curr + step, target);
        el.textContent = Math.round(curr) + suffix;
        if (curr >= target) clearInterval(iv);
      }, 28);
      obs.disconnect();
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, suffix]);
  return <span className="stat-num" ref={ref}>0{suffix}</span>;
}

const STEPS = [
  { num:'01', title:'Connect Wallet',  body:'MetaMask signs a session message. Your signature becomes the encryption key — no server, no password.' },
  { num:'02', title:'Select File',     body:'Choose any file. AES-256 encryption runs entirely in your browser before touching any server.' },
  { num:'03', title:'Chain Anchor',    body:'Encrypted file hash, size, type, and metadata are permanently recorded on the DStorage smart contract.' },
  { num:'04', title:'Share Securely',  body:'Generate cryptographic share links scoped to any recipient wallet. Only their wallet can decrypt.' },
];

const FEATURES = [
  { icon:'🔐', title:'Client-Side Encryption', body:'AES-256 runs in your browser. Plaintext never leaves your device.' },
  { icon:'⛓️', title:'Immutable Registry',     body:'Every upload is anchored on-chain. File provenance is permanent and tamper-proof.' },
  { icon:'🔑', title:'Wallet-Derived Keys',    body:'Your MetaMask signature is your encryption key. No passwords, no trusted parties.' },
  { icon:'🌐', title:'Permissioned Sharing',   body:'Access links are scoped to specific wallet addresses. Only the intended recipient can view.' },
  { icon:'⚡', title:'Content-Addressed',      body:'Files identified by SHA-256 hash — deduplication automatic, integrity self-verifying.' },
  { icon:'🗡️', title:'Zero-Knowledge Server',  body:'The storage server holds only ciphertext. It cannot read your files — period.' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="iv-page" style={{ paddingTop: 0 }}>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="hero">
        <p className="hero-eyebrow">⬡ DECENTRALIZED · ENCRYPTED · IMMUTABLE ⬡</p>
        <h1 className="hero-title">INDRAVAULT</h1>
        <p className="hero-sub">The Sacred Repository of the Digital Age</p>
        <p className="hero-desc">
          Store your files on the blockchain with end-to-end encryption.
          Only your wallet holds the key. Only you control the vault.
        </p>
        <div className="hero-cta">
          <MagneticButton
            className="btn-primary-iv"
            onClick={() => navigate('/vault')}
          >
            <span className="btn-inner">⬡ &nbsp;OPEN VAULT</span>
          </MagneticButton>
          <MagneticButton
            className="btn-outline-iv"
            onClick={() => document.getElementById('how-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            LEARN MORE
          </MagneticButton>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────── */}
      <div className="stats-bar">
        <div className="stat-item"><AnimatedCounter target={256} />  <span className="stat-label">AES Encryption Bits</span></div>
        <div className="stat-item"><AnimatedCounter target={100} suffix="%" /><span className="stat-label">On-Chain Integrity</span></div>
        <div className="stat-item"><span className="stat-num">SHA-256</span><span className="stat-label">Content Addressing</span></div>
        <div className="stat-item"><span className="stat-num">∞</span><span className="stat-label">Files Per Wallet</span></div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="iv-section" id="how-section">
        <RevealSection>
          <div className="divider-rune"><span className="rune-glyph">◈ THE PROTOCOL ◈</span></div>
          {/*<span className="section-tag">// How It Works</span>*/}
          <h2 className="section-title">Four Steps to Immortal Storage</h2>
        </RevealSection>

        <div className="steps-grid">
          {STEPS.map((s, i) => (
            <RevealSection key={s.num} delay={`${i * 0.12}s`}>
              <div className="step-card">
                <div className="step-num">{s.num}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-body">{s.body}</div>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section className="iv-section">
        <RevealSection>
          <div className="divider-rune"><span className="rune-glyph">◈ THE ARSENAL ◈</span></div>
          {/*<span className="section-tag">// Features</span>*/}
          <h2 className="section-title">Divine-Grade Security Architecture</h2>
        </RevealSection>

        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <RevealSection key={f.title} delay={`${i * 0.08}s`}>
              <div className="feat-card">
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-body">{f.body}</div>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ── CTA STRIP ────────────────────────────────────── */}
      <section className="home-cta-strip">
        <RevealSection>
          <p className="hero-eyebrow" style={{ opacity: 1 }}>Ready to begin?</p>
          <h2 style={{ fontFamily:'var(--ff-display)', fontSize:'clamp(1.4rem,4vw,2.2rem)', color:'var(--gold)', marginBottom:'1.6rem' }}>
            Enter the Vault
          </h2>
          <MagneticButton className="btn-primary-iv" onClick={() => navigate('/vault')}>
            <span className="btn-inner">⬡ &nbsp;OPEN VAULT</span>
          </MagneticButton>
        </RevealSection>
      </section>

      {/* Footer */}
      <footer className="iv-footer">
        <strong>INDRAVAULT</strong> &nbsp;·&nbsp; Decentralized Sacred Storage &nbsp;·&nbsp;
        Built on Ethereum &nbsp;·&nbsp; AES-256 + SHA-256
      </footer>
    </div>
  );
}

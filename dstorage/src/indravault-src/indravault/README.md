# INDRAVAULT — Decentralized Sacred Storage

> Dark "divine tech" frontend for the DStorage dApp.  
> AES-256 encrypted · blockchain-anchored · wallet-scoped sharing.

---

## File Structure

```
src/
├── App.js                   ← Root: routing, global state, Web3/blockchain logic
├── App.css                  ← All INDRAVAULT styles (single stylesheet)
├── encryption.js            ← encryptFile / decryptFile (unchanged logic)
├── helpers.js               ← convertBytes, formatTime, getFileIcon, shortAddr
├── index.js                 ← React entry point
│
├── components/
│   ├── ChainCanvas.js       ← Animated blockchain canvas background (endless loop)
│   ├── MagneticButton.js    ← Cursor-following magnetic button
│   ├── Navbar.js            ← Nav with network status pill + account badge
│   ├── NetworkModal.js      ← Custom modal replacing window.alert for network errors
│   ├── ScrollReveal.js      ← useScrollReveal hook + RevealSection component
│   └── Toast.js             ← ToastProvider context + useToast hook
│
└── pages/
    ├── Home.js              ← Landing page (hero, stats, steps, features) — NO upload/list
    ├── Vault.js             ← /vault — upload panel + file list (same page)
    └── FileViewer.js        ← /viewer/:key — decrypts + previews shared/own files
```

---

## Routes

| Path            | Page        | Description                                  |
|-----------------|-------------|----------------------------------------------|
| `/`             | Home        | Landing — no upload, no file list            |
| `/vault`        | Vault       | Upload + file list (both on same page)       |
| `/viewer/:key`  | FileViewer  | Decrypts and previews a file by access key   |

---

## Network Status (top-right)

- Shows **"NETWORK ONLINE"** (pulsing green) **only** when:
  - MetaMask wallet is connected, **AND**
  - Connected to the network where DStorage is deployed
- Bound directly to `loadBlockchainData()` in `App.js`
- Updates in real-time on wallet/network change
- Wrong network shows **OFFLINE** (red) + fires the `NetworkModal` (no `window.alert`)

---

## Setup

```bash
# 1. Copy your DStorage.json ABI into:
#    src/abis/DStorage.json

# 2. Install dependencies
npm install

# 3. Start Ganache on port 7545

# 4. Migrate contracts
truffle migrate --reset

# 5. Start file server (port 9000)
cd server && node index.js

# 6. Start frontend (port 3000)
npm start
```

---

## Key Design Decisions

- **`window.alert` removed** — all network errors use `NetworkModal` component
- **Network status** is driven by `loadBlockchainData()` success/failure, not a separate check
- **Encryption key** derived from MetaMask personal signature (session-scoped, clears on account change)
- **Sharing** generates a CryptoJS-AES-encrypted access key tied to the recipient's wallet address
- **File viewer** at `/viewer/:key` works standalone — anyone with the link + correct wallet can decrypt

---

## Animations

| Effect              | Implementation                                  |
|---------------------|-------------------------------------------------|
| Blockchain canvas   | `ChainCanvas.js` — Canvas 2D, requestAnimationFrame, endless loop |
| Scramble text       | `Navbar.js` — character randomization on mount + hover |
| Glitch title        | CSS `glitchPeriodic` keyframes on `.hero-title` |
| Magnetic buttons    | `MagneticButton.js` — `mousemove` translate     |
| Scroll reveals      | `ScrollReveal.js` — IntersectionObserver        |
| Click ripple        | `App.js CursorManager` — injected DOM elements  |
| Custom cursor       | `App.js CursorManager` — dot + lagging ring     |
| Scanline overlay    | CSS fixed `overlay-scanlines`                   |
| Hash scramble       | `Vault.js scrambleHash()` — post-upload effect  |
| Upload progress bar | CSS transition on `.progress-bar` width         |
| Toast notifications | `Toast.js` — context-based, auto-dismiss        |

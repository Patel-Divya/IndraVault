import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Web3 from 'web3';
import DStorage from './abis/DStorage.json';

import './App.css';
import { ToastProvider } from './components/Toast';
import ChainCanvas from './components/ChainCanvas';
import Navbar from './components/Navbar';
import NetworkModal from './components/NetworkModal';

import Home       from './pages/Home';
import Vault      from './pages/Vault';
import FileViewer from './pages/FileViewer';

/* ── Cursor + ripple (mounted once at root) ────────────── */
class CursorManager extends Component {
  dot  = React.createRef();
  ring = React.createRef();
  mx   = 0; my = 0; rx = 0; ry = 0;
  raf  = null;
  hovered = false;

  componentDidMount() {
    document.addEventListener('mousemove', this.onMove);
    document.addEventListener('click',     this.onClick);
    this.raf = requestAnimationFrame(this.tick);
  }
  componentWillUnmount() {
    document.removeEventListener('mousemove', this.onMove);
    document.removeEventListener('click',     this.onClick);
    cancelAnimationFrame(this.raf);
  }

  onMove = (e) => {
    this.mx = e.clientX; this.my = e.clientY;
    const el = e.target;
    const interactive = el.closest('button,a,[role=button],input,label');
    const ring = this.ring.current;
    if (ring) ring.classList.toggle('hovered', !!interactive);
  };

  onClick = (e) => {
    const r = document.createElement('div');
    r.className = 'iv-ripple';
    r.style.left = e.clientX + 'px';
    r.style.top  = e.clientY + 'px';
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 700);
  };

  tick = () => {
    const { mx, my } = this;
    this.rx += (mx - this.rx) * 0.12;
    this.ry += (my - this.ry) * 0.12;
    if (this.dot.current)  { this.dot.current.style.left  = mx + 'px'; this.dot.current.style.top  = my + 'px'; }
    if (this.ring.current) { this.ring.current.style.left = this.rx + 'px'; this.ring.current.style.top = this.ry + 'px'; }
    this.raf = requestAnimationFrame(this.tick);
  };

  render() {
    return (
      <>
        <div className="cursor-dot"  ref={this.dot}  />
        <div className="cursor-ring" ref={this.ring} />
      </>
    );
  }
}

/* ════════════════════════════════════════════════════════════
   APP — Global state owner (Web3, account, files, encryption)
════════════════════════════════════════════════════════════ */
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      account:       '',
      dstorage:      null,
      files:         [],
      loading:       false,
      encryptionKey: '',
      networkOnline: false,
      // Modal
      modalOpen:  false,
      modalIcon:  '⚠️',
      modalTitle: '',
      modalBody:  '',
    };
  }

  async componentDidMount() {
    await this.loadWeb3();
    await this.loadBlockchainData();
    await this.signDefaultMessage();
  }

  /* ── Web3 init (from App.js) ───────────────────────────── */
  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      await window.ethereum.enable();

      window.ethereum.on('accountsChanged', async (accounts) => {
        console.log('Account switched:', accounts[0]);
        sessionStorage.removeItem('encryptionKey');
        this.setState({ account: accounts[0], encryptionKey: null, networkOnline: false });
        await this.signDefaultMessage();
        await this.loadBlockchainData();
      });

      window.ethereum.on('chainChanged', () => window.location.reload());

    } else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider);
    } else {
      this.showModal('⚠️', 'NO ETHEREUM WALLET',
        'Non-Ethereum browser detected. Please install MetaMask to use INDRAVAULT.'
      );
    }
  }

  /* ── Blockchain data (from App.js) ─────────────────────── */
  async loadBlockchainData() {
    try {
      const web3     = window.web3;
      const accounts = await web3.eth.getAccounts();
      this.setState({ account: accounts[0] });

      const networkId   = await web3.eth.net.getId();
      const networkData = DStorage.networks[networkId];

      if (networkData) {
        // ✅ Correct network — set online
        const dstorage = new web3.eth.Contract(DStorage.abi, networkData.address);
        this.setState({ dstorage, networkOnline: true });

        const filesCount = await dstorage.methods.fileCount().call();
        this.setState({ filesCount });

        const ids   = await dstorage.methods.getUserFiles(accounts[0]).call();
        const files = [];
        for (const id of ids) {
          const file = await dstorage.methods.files(id).call();
          files.push(file);
        }
        this.setState({ files });
      } else {
        // ❌ Wrong network — set offline + show modal (NOT window.alert)
        this.setState({ networkOnline: false });
        this.showModal(
          '⛔',
          'UNSUPPORTED NETWORK',
          `The INDRAVAULT contract is not deployed on network ID ${networkId}. ` +
          `Please switch to the correct network (Ganache / Localhost 7545) in MetaMask and reload.`
        );
      }
    } catch (err) {
      console.error('loadBlockchainData error:', err);
      this.setState({ networkOnline: false });
    }
  }

  /* ── Session signing (from App.js) ─────────────────────── */
  async signDefaultMessage() {
    try {
      const web3 = window.web3;
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      const account  = accounts[0];

      let key = sessionStorage.getItem('encryptionKey');
      if (!key) {
        const message   = 'Login to DStorage Secure Session';
        const signature = await web3.eth.personal.sign(message, account);
        sessionStorage.setItem('encryptionKey', signature);
        this.setState({ encryptionKey: signature });
      } else {
        this.setState({ encryptionKey: key });
      }
    } catch (err) {
      console.error('User denied signature:', err);
    }
  }

  /* ── Reload files (called after upload) ────────────────── */
  reloadFiles = async () => {
    try {
      const { dstorage, account } = this.state;
      if (!dstorage || !account) return;
      const ids   = await dstorage.methods.getUserFiles(account).call();
      const files = [];
      for (const id of ids) {
        const file = await dstorage.methods.files(id).call();
        files.push(file);
      }
      this.setState({ files });
    } catch (err) {
      console.error('reloadFiles error:', err);
    }
  };

  /* ── Modal helpers ──────────────────────────────────────── */
  showModal = (icon, title, body) => this.setState({ modalOpen: true, modalIcon: icon, modalTitle: title, modalBody: body });
  closeModal = () => this.setState({ modalOpen: false });
  retryNetwork = () => { this.closeModal(); this.loadBlockchainData(); };

  /* ── Render ─────────────────────────────────────────────── */
  render() {
    const { account, dstorage, files, encryptionKey, networkOnline,
            modalOpen, modalIcon, modalTitle, modalBody } = this.state;

    return (
      <Router>
        <ToastProvider>
          {/* Fixed background layers */}
          <ChainCanvas />
          <div className="overlay-scanlines" />
          <div className="overlay-noise" />

          {/* Cursor */}
          <CursorManager />

          {/* Network error modal (replaces window.alert) */}
          <NetworkModal
            isOpen={modalOpen}
            icon={modalIcon}
            title={modalTitle}
            body={modalBody}
            onClose={this.closeModal}
            onRetry={this.retryNetwork}
          />

          {/* Navbar (always visible) */}
          <Navbar account={account} networkOnline={networkOnline} />

          {/* Routes */}
          <Routes>
            <Route path="/" element={<Home />} />

            <Route
              path="/vault"
              element={
                <Vault
                  files={files}
                  account={account}
                  dstorage={dstorage}
                  encryptionKey={encryptionKey}
                  networkOnline={networkOnline}
                  onFilesChanged={this.reloadFiles}
                />
              }
            />

            <Route path="/viewer/:key" element={<FileViewer />} />
          </Routes>
        </ToastProvider>
      </Router>
    );
  }
}

export default App;

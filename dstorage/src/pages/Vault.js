import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import { encryptFile } from '../encryption';
import { convertBytes, getFileIcon, formatTime, showNotification } from '../helpers';
import { useToast } from '../components/Toast';

const SCRAMBLE_CHARS = '0123456789ABCDEF';

function scrambleHash(el, final, ms = 28, steps = 30) {
  let iter = 0;
  const iv = setInterval(() => {
    el.textContent = final.split('').map((c, i) =>
      i < (iter / steps) * final.length
        ? c
        : SCRAMBLE_CHARS[Math.floor(Math.random() * 16)]
    ).join('');
    iter++;
    if (iter > steps) { el.textContent = final; clearInterval(iv); }
  }, ms);
}

/**
 * Props:
 *   files           – array of file objects from blockchain
 *   account         – wallet address string
 *   dstorage        – web3 contract instance
 *   encryptionKey   – session encryption key (signature)
 *   networkOnline   – bool
 *   onFilesChanged  – callback to reload files after upload
 */
export default function Vault({ files, account, dstorage, encryptionKey, networkOnline, onFilesChanged }) {
  const toast    = useToast();
  const navigate = useNavigate();

  /* ── Upload state ─────────────────────────────────────── */
  const [buffer,      setBuffer]      = useState(null);
  const [fileType,    setFileType]    = useState(null);
  const [fileName,    setFileName]    = useState(null);
  const [description, setDescription] = useState('');
  const [dragOver,    setDragOver]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [hashText,    setHashText]    = useState('');
  const hashRef = useRef(null);

  /* ── File capture (from App.js) ───────────────────────── */
  const captureFile = useCallback((file) => {
    if (!file) return;
    const reader = new window.FileReader();
    reader.readAsArrayBuffer(file);
    reader.onloadend = () => {
      setBuffer(reader.result);
      setFileType(file.type);
      setFileName(file.name);
    };
  }, []);

  const onInputChange = (e) => { e.preventDefault(); captureFile(e.target.files[0]); };

  /* ── Drag + drop ──────────────────────────────────────── */
  const onDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = ()  => setDragOver(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setDragOver(false);
    captureFile(e.dataTransfer.files[0]);
  };

  /* ── Upload (from App.js uploadFile) ──────────────────── */
  const handleUpload = async () => {
    if (!encryptionKey)  { toast('Encryption key not ready — please sign the MetaMask message.', 'error'); return; }
    if (!buffer)         { toast('Please select a file first.', 'error'); return; }
    if (!dstorage)       { toast('Not connected to DStorage contract.', 'error'); return; }

    setUploading(true);
    setProgress(10);
    setHashText('');

    try {
      // Encrypt
      const encrypted = encryptFile(buffer, encryptionKey);
      setProgress(35);

      // Upload to file server
      const blob = new Blob([encrypted], { type: 'text/plain' });
      const data = new FormData();
      data.append('file', blob, fileName);

      const res    = await fetch('http://localhost:9000/upload', { method: 'POST', body: data });
      const result = await res.json();
      setProgress(60);

      // Scramble hash preview
      setHashText(result.hash);
      setTimeout(() => {
        if (hashRef.current) scrambleHash(hashRef.current, result.hash);
      }, 50);

      // On-chain transaction
      const type = fileType || 'none';
      await new Promise((resolve, reject) => {
        dstorage.methods.uploadFile(
          result.hash,
          result.size,
          type,
          fileName,
          description
        ).send({ from: account })
          .on('transactionHash', () => setProgress(85))
          .on('receipt',  resolve)
          .on('error',    reject);
      });

      setProgress(100);
      toast('File encrypted and anchored on-chain!', 'success');

      // Reset form
      setBuffer(null); setFileType(null); setFileName(null); setDescription('');
      setTimeout(() => { setProgress(0); setHashText(''); setUploading(false); }, 2500);

      // Reload file list
      if (onFilesChanged) onFilesChanged();

    } catch (err) {
      console.error('Upload error:', err);
      toast('Upload failed: ' + (err.message || 'Unknown error'), 'error');
      setUploading(false);
      setProgress(0);
    }
  };

  /* ── Generate access key (from Main.js) ───────────────── */
  const generateAccessKey = (wallet, encKey, fileHash, fName, fType) => {
    const payload    = JSON.stringify({ key: encKey, hash: fileHash, name: fName, type: fType });
    return CryptoJS.AES.encrypt(payload, wallet).toString();
  };

  /* ── Share file (from Main.js) ────────────────────────── */
  const shareFile = async (file) => {
    const recipient = window.prompt("Enter recipient's wallet address (0x...):");
    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      toast('Invalid Ethereum address.', 'error');
      return;
    }
    const currentKey = sessionStorage.getItem('encryptionKey');
    if (!currentKey) { toast('Session key missing — please re-sign.', 'error'); return; }

    const accessKey = generateAccessKey(recipient, currentKey, file.fileHash, file.fileName, file.fileType);
    const link      = `${window.location.origin}/viewer/${encodeURIComponent(accessKey)}`;

    try {
      await navigator.clipboard.writeText(link);
      toast('Shareable link copied to clipboard!', 'success');
    } catch {
      window.prompt('Copy this link:', link);
    }
  };

  /* ── View own file ────────────────────────────────────── */
  const viewFile = (file) => {
    const key       = sessionStorage.getItem('encryptionKey');
    const accessKey = generateAccessKey(file.uploader, key, file.fileHash, file.fileName, file.fileType);
    navigate(`/viewer/${encodeURIComponent(accessKey)}`);
  };

  const deleteFile = async (file) => {
    if (!window.confirm("Delete this file?")) return;

    try {
      await fetch(`http://localhost:9000/file/${file.fileHash}`, {
        method: "DELETE"
      });

      await dstorage.methods.deleteFile(file.fileId)
        .send({ from: account });

      showNotification("Deleted");// Reload file list
      if (onFilesChanged) onFilesChanged();
    } catch (err) {
      console.error(err);
      showNotification("Delete failed", 'error');
    }
  };

  /* ── Render ───────────────────────────────────────────── */
  const sorted = [...(files || [])].reverse();

  return (
    <div className="iv-page">
      {/* Header */}
      <div className="vault-header">
        <h1 className="vault-title">⬡ THE VAULT</h1>
        <p className="vault-sub">Your encrypted file sanctuary</p>
      </div>

      <div className="vault-layout">

        {/* ── LEFT: Upload panel ─────────────────────────── */}
        <div>
          <div className="iv-panel">
            <div className="iv-panel-header">⬡ &nbsp;UPLOAD FILE</div>
            <div className="iv-panel-body">

              {/* Drop zone */}
              <div
                className={`upload-zone${dragOver ? ' drag-over' : ''}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <input type="file" onChange={onInputChange} disabled={uploading} />
                <span className="upload-icon">📁</span>
                <p className="upload-hint">DROP FILE OR CLICK TO SELECT</p>
                {fileName && <p className="upload-name">{fileName}</p>}
              </div>

              {/* Description */}
              <input
                type="text"
                className="iv-input"
                placeholder="description…"
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={uploading}
              />

              {/* Progress */}
              {progress > 0 && (
                <div className="progress-wrap">
                  <div className="progress-bar" style={{ width: `${progress}%` }} />
                </div>
              )}

              {/* Hash preview */}
              {hashText && (
                <div className="hash-preview" ref={hashRef}>{hashText}</div>
              )}

              {/* Upload button */}
              <button
                className="btn-primary-iv"
                style={{ width: '100%', marginTop: '0.5rem' }}
                onClick={handleUpload}
                disabled={uploading || !networkOnline}
              >
                <span className="btn-inner">
                  {uploading
                    ? <><span className="spinner" /> &nbsp;{progress < 60 ? 'ENCRYPTING…' : progress < 90 ? 'UPLOADING…' : 'ANCHORING…'}</>
                    : '⬡ UPLOAD TO VAULT'
                  }
                </span>
              </button>

              {!networkOnline && (
                <p style={{ fontFamily:'var(--ff-mono)', fontSize:'0.7rem', color:'var(--danger)', marginTop:'0.6rem', textAlign:'center' }}>
                  Connect to the correct network to upload.
                </p>
              )}
            </div>
          </div>

          {/* Wallet info */}
          <div className="wallet-strip">
            <div className="wallet-label">CONNECTED WALLET</div>
            <div className="wallet-addr">{account || '—'}</div>
          </div>
        </div>

        {/* ── RIGHT: File list panel ─────────────────────── */}
        <div className="iv-panel">
          <div className="iv-panel-header">
            ⬡ &nbsp;YOUR FILES
            <span className="badge">{sorted.length} file{sorted.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="iv-panel-body">
            {sorted.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🗄️</span>
                <div className="empty-msg">
                  {networkOnline
                    ? 'No files in your vault yet. Upload your first file to begin.'
                    : 'Connect to the correct network to view your files.'}
                </div>
              </div>
            ) : (
              <div className="file-list">
                {sorted.map((file, i) => (
                  <div className="file-row" key={file.fileId || i}>
                    <span className="file-icon">{getFileIcon(file.fileType)}</span>
                    <div className="file-info">
                      <div className="file-name" title={file.fileName}>{file.fileName}</div>
                      <div className="file-meta">
                        <span>📦 {convertBytes(file.fileSize)}</span>
                        <span>🏷️ {file.fileType || 'unknown'}</span>
                        <span>🕒 {formatTime(file.uploadTime)}</span>
                        {file.fileDescription && <span>📝 {file.fileDescription}</span>}
                      </div>
                    </div>
                    <div className="file-actions">
                      <button className="btn-sm-iv" onClick={() => viewFile(file)}>VIEW</button>
                      <button className="btn-sm-iv share" onClick={() => shareFile(file)}>SHARE</button>
                      <button className="btn-sm-iv delete" onClick={() => deleteFile(file)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>{/* vault-layout */}
    </div>
  );
}

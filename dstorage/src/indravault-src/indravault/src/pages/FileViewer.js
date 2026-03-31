import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import Web3 from 'web3';
import { decryptFile } from '../encryption';
import { convertBytes } from '../helpers';

const VIEW_TYPES = ['image/', 'video/', 'audio/', 'text/', 'application/pdf'];

export default function FileViewer() {
  const { key: encodedKey } = useParams();   // route: /viewer/:key
  const navigate = useNavigate();

  const [status,   setStatus]   = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error,    setError]    = useState('');
  const [fileURL,  setFileURL]  = useState(null);
  const [blob,     setBlob]     = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [viewable, setViewable] = useState(false);

  useEffect(() => {
    if (!encodedKey) { setStatus('error'); setError('No file key provided.'); return; }
    loadFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encodedKey]);

  /* ── Core decrypt logic (from FileViewer.js) ────────── */
  const loadFile = async () => {
    try {
      setStatus('loading');
      setFileURL(null); setBlob(null); setFileName(''); setFileType(''); setFileSize(0);

      const web3     = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const wallet   = accounts[0];

      // Decode access key using the viewer's wallet
      const decodedData = decodeURIComponent(encodedKey);
      let fileData;
      try {
        const plain = CryptoJS.AES.decrypt(decodedData, wallet).toString(CryptoJS.enc.Utf8);
        if (!plain) throw new Error('blank decrypt');
        fileData = JSON.parse(plain);
      } catch {
        throw new Error('Invalid access key or wrong wallet connected.');
      }

      const { hash, key: encKey, name, type } = fileData;
      if (!hash || !encKey || !name || !type) throw new Error('Malformed file data.');

      // Fetch encrypted blob from file server
      const res = await fetch(`http://localhost:9000/file/${hash}`);
      if (!res.ok) throw new Error('File not found on server (it may have been removed).');

      const encryptedText = await res.text();

      // Decrypt
      let decrypted;
      try {
        decrypted = decryptFile(encryptedText, encKey);
      } catch {
        throw new Error('Decryption failed — corrupted data or wrong encryption key.');
      }

      const mimeType  = decodeURIComponent(type);
      const realName  = decodeURIComponent(name);
      const fileBlob  = new Blob([decrypted], { type: mimeType });
      const url       = URL.createObjectURL(fileBlob);
      const isViewable = VIEW_TYPES.some(t => mimeType.startsWith(t));

      setFileURL(url);
      setBlob(fileBlob);
      setFileName(realName);
      setFileType(mimeType);
      setFileSize(fileBlob.size);
      setViewable(isViewable);
      setStatus('ready');

    } catch (err) {
      console.error('FileViewer error:', err);
      setError(err.message || 'Unable to load file.');
      setStatus('error');
    }
  };

  /* ── Download ────────────────────────────────────────── */
  const handleDownload = () => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
  };

  /* ── Render helpers ──────────────────────────────────── */
  const renderPreview = () => {
    if (!viewable) return <p className="viewer-no-preview">Preview not supported for this file type.</p>;
    if (fileType.startsWith('image/'))      return <img src={fileURL} alt={fileName} />;
    if (fileType.startsWith('video/'))      return <video src={fileURL} controls />;
    if (fileType.startsWith('audio/'))      return <audio src={fileURL} controls />;
    if (fileType === 'application/pdf')     return <iframe src={fileURL} title={fileName} height="600px" />;
    if (fileType.startsWith('text/'))       return <iframe src={fileURL} title={fileName} height="420px" />;
    return null;
  };

  return (
    <div className="iv-page">
      <div className="viewer-wrap">
        <div className="viewer-card">

          {/* Header */}
          <div className="viewer-card-header">
            ⬡ &nbsp;INDRAVAULT — FILE VIEWER
            <button className="viewer-back" onClick={() => navigate('/vault')}>← VAULT</button>
          </div>

          {/* Body */}
          <div className="viewer-body">

            {status === 'loading' && (
              <div className="loading-center">
                <div className="spinner" />
                <span>Decrypting file…</span>
              </div>
            )}

            {status === 'error' && (
              <div style={{ padding: '2rem' }}>
                <div className="viewer-error">⛔ &nbsp;{error}</div>
                <div style={{ marginTop: '1.2rem', display:'flex', gap:'0.8rem', justifyContent:'center' }}>
                  <button className="btn-outline-iv" onClick={() => navigate('/vault')}>← BACK TO VAULT</button>
                  <button className="btn-primary-iv" onClick={loadFile}><span className="btn-inner">RETRY</span></button>
                </div>
              </div>
            )}

            {status === 'ready' && (
              <>
                <div className="viewer-filename">{fileName}</div>
                <div className="viewer-meta">{fileType} &nbsp;|&nbsp; {convertBytes(fileSize)}</div>
                <div className="viewer-preview">{renderPreview()}</div>
                <button className="btn-primary-iv" onClick={handleDownload}>
                  <span className="btn-inner">⬡ &nbsp;DOWNLOAD DECRYPTED FILE</span>
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

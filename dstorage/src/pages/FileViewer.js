import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
import Web3 from 'web3';
import { decryptChunk, importKey } from '../encryption';
import { convertBytes } from '../helpers';
import streamSaver from 'streamsaver';

const VIEW_TYPES = ['image/', 'video/', 'audio/', 'text/', 'application/pdf'];
const MAX_PREVIEW_SIZE = 200 * 1024 * 1024; // 200MB

export default function FileViewer() {
  const { key: encodedKey } = useParams();   // route: /viewer/:key
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('');
  const [fileURL, setFileURL] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [viewable, setViewable] = useState(false);
  const [largeFile, setLargeFile] = useState(false);
  const [hash, setHash] = useState(null);
  const [encKey, setEncKey] = useState(null);

  const videoRef = React.useRef(null);
  const audioRef = React.useRef(null);
  const abortRef = React.useRef(null);
  const manifestRef = React.useRef(null);

  useEffect(() => {
    if (!encodedKey) { setStatus('error'); setError('No file key provided.'); return; }
    loadFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encodedKey]);

  useEffect(() => {
    return () => {
      if (fileURL) {
        URL.revokeObjectURL(fileURL);
      }
    };
  }, [fileURL]);

  // Stream media once refs are available
  useEffect(() => {
    const startStreaming = async () => {
      if (!hash || !encKey || !fileType) return; // wait until file is loaded

      const keyObj = await importKey(encKey);

      try {
        if (fileType.startsWith("video/") && videoRef.current) {
          
          await streamMedia(videoRef.current, fileType, manifestRef.current, keyObj, hash);
          setViewable(true);
        } else if (fileType.startsWith("audio/") && audioRef.current) {
          await streamMedia(audioRef.current, fileType, manifestRef.current, keyObj, hash);
          setViewable(true);
        }
      } catch (err) {
        console.error("Streaming error:", err);
        setError(err.message);
        setStatus('error');
      }
    };

    startStreaming();
  }, [videoRef.current, audioRef.current, fileType, hash, encKey]);

  // Helpers for loadFile
  // async function streamMedia(mediaEl, mimeType, reader, manifest, keyObj) {
  //   const mediaSource = new MediaSource();
  //   const objectURL = URL.createObjectURL(mediaSource);
  //   if (mediaEl.src) {
  //     URL.revokeObjectURL(mediaEl.src);
  //   }

  //   mediaEl.src = objectURL;
  //   mediaEl.onended = () => {
  //     URL.revokeObjectURL(objectURL);
  //   };

  //   async function handleSeek() {
  //     const seekTime = mediaEl.currentTime;
  //     const duration = mediaEl.duration || 1; // avoid div by zero
  //     const chunkIndex = Math.floor((seekTime / duration) * manifest.totalChunks);

  //     // abort previous stream if any
  //     if (abortRef.current) {
  //       abortRef.current.abort();
  //     }
  //     abortRef.current = new AbortController();

  //     const newReader = await fetch(
  //       `http://localhost:9000/stream/${hash}/${chunkIndex}`,
  //       { signal: abortRef.current.signal }
  //     ).then(r => r.body.getReader());

  //     const mediaSource2 = new MediaSource();
  //     const objectURL2 = URL.createObjectURL(mediaSource2);

  //     if (mediaEl.src) {
  //       URL.revokeObjectURL(mediaEl.src);
  //     }
  //     mediaEl.src = objectURL2;

  //     mediaEl.onended = () => {
  //       URL.revokeObjectURL(objectURL2);
  //     };

  //     mediaSource2.addEventListener("sourceopen", async () => {
  //       const sb = mediaSource2.addSourceBuffer(mimeType);
  //       let idx = chunkIndex;

  //       async function append(c) {
  //         return new Promise(resolve => {
  //           sb.addEventListener("updateend", resolve, { once: true });
  //           sb.appendBuffer(c);
  //         });
  //       }

  //       // ✅ Remove MAX_CHUNKS limit
  //       while (true) {
  //         const { done, value } = await newReader.read();
  //         if (done) break;

  //         const chunkMeta = manifest.chunks[idx];
  //         if (!chunkMeta) break;
  //         const { iv } = chunkMeta;

  //         const decrypted = await decryptChunk(value, iv, keyObj);
  //         await append(decrypted);
  //         idx++;
  //       }

  //       mediaSource2.endOfStream();
  //     });
  //   }

  //   mediaSource.addEventListener("sourceopen", async () => {
  //     const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
  //     let index = 0;

  //     async function appendChunk(chunk) {
  //       return new Promise((resolve) => {
  //         sourceBuffer.addEventListener("updateend", resolve, { once: true });
  //         sourceBuffer.appendBuffer(chunk);
  //       });
  //     }

  //     // Read + decrypt chunks
  //     const MAX_BUFFER_AHEAD = 30; // seconds
  //     while (true) {
  //       const buffered = mediaEl.buffered;

  //       if (buffered.length > 0) {
  //         const bufferedEnd = buffered.end(buffered.length - 1);

  //         if (bufferedEnd - mediaEl.currentTime > MAX_BUFFER_AHEAD) {
  //           await new Promise(r => setTimeout(r, 500));
  //           continue;
  //         }
  //       }

  //       const { done, value } = await reader.read();
  //       if (done) break;

  //       const chunkMeta = manifest.chunks[index];
  //       if (!chunkMeta) break;
  //       const { iv } = chunkMeta;

  //       const decryptedChunk = await decryptChunk(value, iv, keyObj);
  //       await appendChunk(decryptedChunk);

  //       index++;
  //     }

  //     mediaSource.endOfStream();
  //   });

  //   // SEEK / fast-forward support
  //   mediaEl.onseeking = () => handleSeek();
  // }
  // Progressive Blob streaming for encrypted MP4 chunks
  async function streamMedia(mediaEl, mimeType, manifest, keyObj, hash) {
    console.log('streamMedia called');

    // Store decrypted chunks
    const chunks = [];

    try {
      for (let i = 0; i < manifest.totalChunks; i++) {
        const chunkMeta = manifest.chunks[i];
        if (!chunkMeta) break;

        const { iv } = chunkMeta;

        const res = await fetch(`http://localhost:9000/stream/${hash}/${i}`);
        if (!res.ok) throw new Error(`Chunk ${i} fetch failed`);

        const encrypted = new Uint8Array(await res.arrayBuffer());
        const decrypted = await decryptChunk(encrypted, iv, keyObj);

        chunks.push(decrypted);

        // Optional: show progressive playback
        if (i === 0) {
          // Create blob from first chunk to start playback
          const blob = new Blob([decrypted], { type: mimeType });
          mediaEl.src = URL.createObjectURL(blob);
          mediaEl.play().catch(() => { }); // Autoplay may require user interaction
        }
      }

      // Combine all chunks at the end
      const fullBlob = new Blob(chunks, { type: mimeType });
      mediaEl.src = URL.createObjectURL(fullBlob);
      await mediaEl.play();
      console.log('Media playback ready');
    } catch (err) {
      console.error('Failed to stream media:', err);
    }
  }

  // async function streamFileFallback(reader, manifest, keyObj, mimeType, size) {
  //   let chunks = [];
  //   let index = 0;

  //   while (true) {
  //     const { done, value } = await reader.read();
  //     if (done) break;

  //     const chunkMeta = manifest.chunks[index];
  //     if (!chunkMeta) break;
  //     const { iv } = chunkMeta;

  //     const decrypted = await decryptChunk(value, iv, keyObj);
  //     chunks.push(decrypted);
  //     index++;
  //   }

  //   const fileBlob = new Blob(chunks, { type: mimeType });
  //   const url = URL.createObjectURL(fileBlob);

  //   setFileURL(url);
  //   setFileSize(size);
  // }
  async function streamFileFallback(manifest, keyObj, mimeType, size, hash) {
    let chunks = [];

    for (let index = 0; index < manifest.totalChunks; index++) {
      const { iv } = manifest.chunks[index];

      const res = await fetch(`http://localhost:9000/stream/${hash}/${index}`);
      if (!res.ok) throw new Error(`Chunk ${index} fetch failed`);

      const encrypted = new Uint8Array(await res.arrayBuffer());
      const decrypted = await decryptChunk(encrypted, iv, keyObj);
      chunks.push(decrypted);
    }

    const blob = new Blob(chunks, { type: mimeType });
    return URL.createObjectURL(blob);
  }

  /* ── Core decrypt logic (from FileViewer.js) ────────── */
  const loadFile = async () => {
    try {
      setStatus('loading');
      setFileURL(null); setFileName(''); setFileType(''); setFileSize(0);

      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const wallet = accounts[0];

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

      const { hash, key: encKey, name, type, size } = fileData;
      if (!hash || !encKey || !name || !type) throw new Error('Malformed file data.');
      const mimeType = decodeURIComponent(type);
      const realName = decodeURIComponent(name);
      setHash(hash);
      setEncKey(encKey);

      // Fetch encrypted blob from file server
      // 1. Fetch manifest first
      const manifestRes = await fetch(`http://localhost:9000/uploads/${hash}/manifest.json`);
      if (!manifestRes.ok) throw new Error('Manifest not found.');

      const manifest = await manifestRes.json();
      manifestRef.current = manifest;

      const totalSize = size || 0;
      setFileSize(totalSize);

      const isStreamable = mimeType.startsWith("video/") || mimeType.startsWith("audio/");

      if (!isStreamable && totalSize > MAX_PREVIEW_SIZE) {
        setLargeFile(true);
      }

      // 2. Start streaming encrypted chunks
      let reader = null;

      if (isStreamable || manifest.totalSize <= MAX_PREVIEW_SIZE) {
        if (abortRef.current) {
          abortRef.current.abort(); // cancel previous stream
        }

        abortRef.current = new AbortController();
        const res = await fetch(`http://localhost:9000/stream/${hash}/0`, {
          signal: abortRef.current.signal
        });
        if (!res.ok) throw new Error('File stream failed');
        reader = res.body.getReader();
      }

      // 3. Prepare decryption key
      const keyObj = await importKey(encKey);

      // if (isStreamable) {
      //   if (mimeType.startsWith("video/") && videoRef.current) {
      //     await streamMedia(videoRef.current, mimeType, reader, manifest, keyObj);
      //   } else if (mimeType.startsWith("audio/") && audioRef.current) {
      //     await streamMedia(audioRef.current, mimeType, reader, manifest, keyObj);
      //   }
      // } else {
      //   if (manifest.totalSize <= MAX_PREVIEW_SIZE) {
      //     await streamFileFallback(reader, manifest, keyObj, mimeType, size);
      //   }
      // }

      if (size <= MAX_PREVIEW_SIZE) {
        const url = await streamFileFallback(manifest, keyObj, mimeType, size, hash);
        setFileURL(url);
        setViewable(true); // ✅ mark it viewable
      }

      const isViewable = VIEW_TYPES.some(t => mimeType.startsWith(t));

      setFileName(realName);
      setFileType(mimeType);
      // setViewable(isViewable);
      setStatus('ready');

    } catch (err) {
      console.error('FileViewer error:', err);
      setError(err.message || 'Unable to load file.');
      setStatus('error');
    }
  };

  /* ── Download ────────────────────────────────────────── */
  // const handleDownload = async () => {
  //   try {
  //     if (!hash || !encKey) {
  //       alert("File not ready. Please wait.");
  //       return;
  //     }

  //     const manifestRes = await fetch(`http://localhost:9000/uploads/${hash}/manifest.json`);
  //     const manifest = await manifestRes.json();

  //     const res = await fetch(`http://localhost:9000/stream/${hash}`);
  //     const reader = res.body.getReader();

  //     const keyObj = await importKey(encKey);
  //     const fileStream = streamSaver.createWriteStream(fileName);
  //     const writer = fileStream.getWriter();

  //     let index = 0;
  //     while (true) {
  //       const { done, value } = await reader.read();
  //       if (done) break;

  //       const chunkMeta = manifest.chunks[index];
  //       if (!chunkMeta) break;
  //       const { iv } = chunkMeta;

  //       const decrypted = await decryptChunk(value, iv, keyObj);
  //       await writer.write(decrypted);

  //       index++;
  //     }

  //     await writer.close();

  //   } catch (err) {
  //     console.error(err);
  //     alert("Download failed");
  //   }
  // };

  const handleDownload = async () => {
    try {
      if (!hash || !encKey) {
        alert("File not ready.");
        return;
      }

      const manifestRes = await fetch(`http://localhost:9000/uploads/${hash}/manifest.json`);
      const manifest = await manifestRes.json();

      const keyObj = await importKey(encKey);

      const fileStream = streamSaver.createWriteStream(fileName);
      const writer = fileStream.getWriter();

      // ✅ SAFE: exact chunk boundaries
      for (let index = 0; index < manifest.totalChunks; index++) {
        const chunkMeta = manifest.chunks[index];
        if (!chunkMeta) break;

        const { iv } = chunkMeta;

        const res = await fetch(`http://localhost:9000/stream/${hash}/${index}`);
        if (!res.ok) throw new Error(`Chunk ${index} failed`);

        const encrypted = new Uint8Array(await res.arrayBuffer());

        const decrypted = await decryptChunk(encrypted, iv, keyObj);

        await writer.write(decrypted);
      }

      await writer.close();

    } catch (err) {
      console.error(err);
      alert("Download failed");
    }
  };

  /* ── Render helpers ──────────────────────────────────── */
  const renderPreview = () => {
    if (!viewable && !largeFile) {
      return <p className="viewer-no-preview">Preview not supported for this file type.</p>;
    }

    if (largeFile) {
      return <p className="viewer-no-preview">File too large to preview. Please download.</p>;
    }

    if (fileType.startsWith('image/')) {
      return <img src={fileURL} alt={fileName} />;
    }

    if (fileType.startsWith('video/')) {
      return <video ref={videoRef} controls autoPlay />;
    }

    if (fileType.startsWith('audio/')) {
      return <audio ref={audioRef} controls />;
    }

    if (fileType === 'application/pdf') {
      return <iframe src={fileURL} title={fileName} height="600px" />;
    }

    if (fileType.startsWith('text/')) {
      return <iframe src={fileURL} title={fileName} height="420px" />;
    }

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
                <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
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

const express = require("express")
const multer = require("multer")
const crypto = require("crypto")
const fs = require("fs")
const cors = require("cors")
const path = require("path")

const app = express()
app.use(cors())

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// storage folder
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB per chunk
});

app.post("/upload-chunk", upload.single("chunk"), (req, res) => {
  const { fileId, index } = req.body;

  const dir = path.join(__dirname, "uploads", fileId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const chunkPath = path.join(dir, `chunk_${index}`);
  fs.renameSync(req.file.path, chunkPath);

  res.json({ success: true });
});

app.post("/upload-manifest", upload.single("manifest"), (req, res) => {
  const { fileId } = req.body;

  const dir = path.join(__dirname, "uploads", fileId);
  const manifestPath = path.join(dir, "manifest.json");
  // console.log("manifest path: ",manifestPath);
  
  fs.renameSync(req.file.path, manifestPath);

  // hash manifest
  const data = fs.readFileSync(manifestPath);
  const hash = crypto.createHash("sha256").update(data).digest("hex");
  // console.log("data: ",data, ", Hash:", hash);  

  const finalPath = path.join(__dirname, "uploads", hash);
  // console.log("final path: ", finalPath);
  
  if (fs.existsSync(finalPath)) {
    fs.rmSync(dir, { recursive: true, force: true });
    res.json({ hash });
  } 
  setTimeout(() => {
    fs.rename(dir, finalPath, (err) => {
      if (err) {
        console.error("Rename failed:", err);

        // fallback
        fs.cpSync(dir, finalPath, { recursive: true });
        fs.rmSync(dir, { recursive: true, force: true });
      }

      res.json({ hash });
    });
  }, 50);
});

// serve files
app.get("/stream/:hash", async (req, res) => {
  const dir = path.join(__dirname, "uploads", req.params.hash);

  const manifestPath = path.join(dir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).send("Manifest not found");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath));

  res.writeHead(200, {
    "Content-Type": "application/octet-stream",
    "Transfer-Encoding": "chunked"
  });

  try {
    for (let i = 0; i < manifest.totalChunks; i++) {
      const chunkPath = path.join(dir, `chunk_${i}`);

      if (!fs.existsSync(chunkPath)) {
        throw new Error(`Missing chunk ${i}`);
      }

      await new Promise((resolve, reject) => {
        const stream = fs.createReadStream(chunkPath);

        stream.on("data", (data) => res.write(data));
        stream.on("end", resolve);
        stream.on("error", reject);
      });
    }

    res.end();

  } catch (err) {
    console.error(err);
    res.destroy();
  }
});

// app.get("/stream/:hash/:start", async (req, res) => {
//   const start = parseInt(req.params.start) || 0;

//   const dir = path.join(__dirname, "uploads", req.params.hash);
//   const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json")));

//   res.writeHead(200, {
//     "Content-Type": "application/octet-stream",
//     "Transfer-Encoding": "chunked"
//   });

//   for (let i = start; i < manifest.totalChunks; i++) {
//     const chunkPath = path.join(dir, `chunk_${i}`);

//     const stream = fs.createReadStream(chunkPath);
//     await new Promise((resolve) => {
//       stream.on("data", (d) => res.write(d));
//       stream.on("end", resolve);
//     });
//   }

//   res.end();
// });

app.get("/stream/:hash/:index", (req, res) => {
  const index = parseInt(req.params.index);

  const dir = path.join(__dirname, "uploads", req.params.hash);
  const chunkPath = path.join(dir, `chunk_${index}`);

  if (!fs.existsSync(chunkPath)) {
    return res.status(404).send("Chunk not found");
  }

  res.writeHead(200, {
    "Content-Type": "application/octet-stream",
  });

  fs.createReadStream(chunkPath).pipe(res);
});

app.delete("/file/:hash", (req, res) => {
  const dir = path.join(__dirname, "uploads", req.params.hash);

  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    return res.json({ success: true });
  }

  res.status(404).json({ error: "File not found" });
});

app.listen(9000, () => {
  console.log("File server running on port 9000")
})
const express = require("express")
const multer = require("multer")
const crypto = require("crypto")
const fs = require("fs")
const cors = require("cors")
const path = require("path")

const app = express()
app.use(cors())

// storage folder
const upload = multer({ dest: "uploads/" })

app.post("/upload", upload.single("file"), (req, res) => {
  try {
    const filePath = req.file.path

    const hash = crypto.createHash("sha256")
    const stream = fs.createReadStream(filePath)

    stream.on("data", data => hash.update(data))

    stream.on("end", () => {
      const digest = hash.digest("hex")
      const newPath = path.join("uploads", digest)

      if (!fs.existsSync(newPath)) {
        fs.renameSync(filePath, newPath)
      } else {
        fs.unlinkSync(filePath)
      }

      res.json({
        hash: digest,
        size: req.file.size
      })
    })
  } catch (err) {

    console.error("UPLOAD ERROR:", err)

    res.status(500).json({
      error: "Upload error",
      details: err.message
    })

  }
})

// upload endpoint
// app.post("/upload", upload.single("file"), (req, res) => {
//   try {
//     const file = req.file

//     // read file
//     // const fileBuffer = fs.readFileSync(file.path)

//     // generate SHA256 hash
//     // const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex")

//     const hash = crypto.createHash("sha256")
//     const stream = fs.createReadStream(file.path)

//     stream.on("data", data => hash.update(data))
//     stream.on("end", () => {
//       const digest = hash.digest("hex")
//     })

//     // get original extension
//     // const ext = path.extname(file.originalname)

//     // new filename with extension
//     // const newName = hash + ext
//     const newName = hash
//     const newPath = path.join("uploads", newName)

//     // rename file
//     fs.renameSync(file.path, newPath)

//     res.json({
//       hash: hash,
//       size: file.size,
//       filename: newName
//     })

//   } catch (err) {
//     console.error(err)
//     res.status(500).send("Upload error")
//   }
// })

// serve files
app.get("/file/:hash", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.hash)

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found")
  }

  res.sendFile(filePath)
})

app.delete("/file/:hash", (req, res) => {
  const hash = req.params.hash;
  const filePath = path.join(__dirname, "uploads", hash);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ success: true });
  }

  res.status(404).json({ error: "File not found" });
});

app.listen(9000, () => {
  console.log("File server running on port 9000")
})
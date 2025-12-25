require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { BlobServiceClient } = require("@azure/storage-blob");
const { CosmosClient } = require("@azure/cosmos");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
const upload = multer();

const blobClient = BlobServiceClient.fromConnectionString(process.env.BLOB_CONN);
const containerClient = blobClient.getContainerClient("files");

const cosmosClient = new CosmosClient(process.env.COSMOS_CONN);
const database = cosmosClient.database("filedb");
const container = database.container("files");

app.post("/api/upload", upload.single("file"), async (req, res) => {
  const blobName = Date.now() + "-" + req.file.originalname;
  const blockBlob = containerClient.getBlockBlobClient(blobName);

  await blockBlob.uploadData(req.file.buffer);

  const item = {
    id: uuidv4(),
    fileName: req.file.originalname,
    description: req.body.description,
    blobUrl: blockBlob.url,
    uploadedAt: new Date().toISOString()
  };

  await container.items.create(item);
  res.json({ message: "Upload successful" });
});

app.get("/api/files", async (req, res) => {
  const { resources } = await container.items.readAll().fetchAll();
  res.json(resources);
});

app.listen(3000, () => console.log("Backend running on port 3000"));

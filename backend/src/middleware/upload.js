const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const maxSize = (process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024;

const allowedExts = [
  ".pdf", ".doc", ".docx", ".pptx", ".ppt",
  ".xls", ".xlsx", ".txt", ".zip",
  ".jpg", ".jpeg", ".png", ".csv",
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) cb(null, true);
  else cb(new Error(`File type ${ext} not allowed`));
};

// ── Cloudinary upload helper (used by controllers) ──
// folder: e.g. "upass/thesis", "upass/avatars"
// Returns { secure_url, public_id }
const uploadToCloudinary = (buffer, originalname, folder) => {
  return new Promise((resolve, reject) => {
    const ext = path.extname(originalname).toLowerCase();
    const resourceType = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)
      ? "image"
      : "raw"; // raw = any non-image/video file (PDFs, docs, etc.)

    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, use_filename: true, unique_filename: true },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// ── Delete from Cloudinary by public_id ──
const deleteFromCloudinary = async (publicIdOrUrl) => {
  if (!useCloudinary || !publicIdOrUrl) return;
  try {
    // If it's a full URL, extract public_id
    let publicId = publicIdOrUrl;
    if (publicIdOrUrl.startsWith("http")) {
      // e.g. https://res.cloudinary.com/cloud/image/upload/v123/upass/avatars/abc.jpg
      const parts = publicIdOrUrl.split("/upload/");
      if (parts[1]) {
        publicId = parts[1].replace(/^v\d+\//, "").replace(/\.[^.]+$/, "");
      }
    }
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" }).catch(() =>
      cloudinary.uploader.destroy(publicId, { resource_type: "image" })
    );
  } catch { /* ignore cleanup errors */ }
};

// ── Multer instance ──
// Always use memory storage so controllers can decide where to send the buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxSize },
  fileFilter,
});

// Disk storage fallback (dev only, when Cloudinary not configured)
const diskUpload = (() => {
  if (useCloudinary) return upload; // not used in prod
  const uploadDir = process.env.UPLOAD_DIR || "./uploads";
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const safeSubDir = (req.uploadSubDir || "general").replace(/[^a-zA-Z0-9_-]/g, "");
      const base = path.resolve(uploadDir);
      const dir = path.resolve(base, safeSubDir);
      if (!dir.startsWith(base)) return cb(new Error("Invalid upload directory"));
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
    },
  });
  return multer({ storage, limits: { fileSize: maxSize }, fileFilter });
})();

const activeUpload = useCloudinary ? upload : diskUpload;

module.exports = activeUpload;
module.exports.memory = upload; // always memory
module.exports.uploadToCloudinary = uploadToCloudinary;
module.exports.deleteFromCloudinary = deleteFromCloudinary;
module.exports.useCloudinary = useCloudinary;

const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB
  },
  fileFilter: (req, file, callback) => {
    const hasPdfExtension = file.originalname.toLowerCase().endsWith(".pdf");
    const hasSupportedMimeType = [
      "application/pdf",
      "application/octet-stream",
    ].includes(file.mimetype);

    if (!hasPdfExtension || !hasSupportedMimeType) {
      callback(new Error("Only PDF resumes are supported."));
      return;
    }

    callback(null, true);
  },
});

module.exports = upload;

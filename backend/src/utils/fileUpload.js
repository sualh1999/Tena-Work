const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const RESUMES_DIR = path.join(UPLOAD_DIR, 'resumes');
const LOGOS_DIR = path.join(UPLOAD_DIR, 'logos');

[UPLOAD_DIR, RESUMES_DIR, LOGOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'resume') {
      cb(null, RESUMES_DIR);
    } else if (file.fieldname === 'logo') {
      cb(null, LOGOS_DIR);
    } else {
      cb(null, UPLOAD_DIR);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'resume') {
    // Accept PDF, DOC, DOCX
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed for resumes'));
    }
  } else if (file.fieldname === 'logo') {
    // Accept images
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and GIF files are allowed for logos'));
    }
  } else {
    cb(new Error('Unexpected field'));
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: fileFilter
});

// Helper to get file URL
function getFileUrl(filename, type) {
  if (!filename) return null;
  
  if (type === 'resume') {
    return `/uploads/resumes/${filename}`;
  } else if (type === 'logo') {
    return `/uploads/logos/${filename}`;
  }
  return `/uploads/${filename}`;
}

// Helper to delete file
function deleteFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  upload,
  getFileUrl,
  deleteFile,
  UPLOAD_DIR,
  RESUMES_DIR,
  LOGOS_DIR
};

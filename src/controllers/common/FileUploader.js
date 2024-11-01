const Media = require('../../models/Media');
const { CustomError, ErrorHandler, ResponseHandler } = require('../../utils/responseHandler');
const multer = require('multer');
const cloudinary = require('../../config/cloudinary');
const { default: mongoose } = require('mongoose');
const storage = multer.memoryStorage(); // Store files in memory (customize as needed)
const upload = multer({ storage: storage });



const uploadMediaToLibrary = async (req, res) => {
  try {
    // Ensure the single file upload field is named "file"
    upload.single("image")(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        console.error("Multer error:", err);
        return ErrorHandler.handleError(new CustomError(400, `Multer error: ${err.message}`), res);
      } else if (err) {
        console.error("Unexpected error:", err);
        return ErrorHandler.handleError(new CustomError(500, "Unexpected error during file upload."), res);
      }

      // Ensure the file is provided
      if (!req.file) {
        return ErrorHandler.handleError(new CustomError(400, "No file provided for upload."), res);
      }

      try {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        const uploadInfo = await handleUpload(dataURI, req.file.originalname, req);

        if (!uploadInfo || !uploadInfo.url) {
          throw new CustomError(500, "Failed to upload image to Cloudinary.");
        }

        const uploadedMedia = {
          title: req.body.title || req.file.originalname.replace(/\.[^.]*$/, ""),
          cloudinary_id: uploadInfo.public_id,
          url: uploadInfo.url,
          // Additional properties as needed
        };

        const savedMedia = await Media.create(uploadedMedia);
        return ResponseHandler.success(res, savedMedia, 200);

      } catch (cloudinaryError) {
        console.error("Cloudinary upload error:", cloudinaryError);
        return ErrorHandler.handleError(new CustomError(500, "Error during Cloudinary upload."), res);
      }
    });
  } catch (generalError) {
    console.error("Unexpected error:", generalError);
    return ErrorHandler.handleError(new CustomError(500, "An unexpected error occurred."), res);
  }
};

async function handleUpload(file, originalname, req) {
  const res = await cloudinary.uploader.upload(file, {
    resource_type: "auto",
    folder: req.headers['domain']
    // Include any other Cloudinary upload options if needed
  });

  return {
    cloudinary_id: res.public_id,
    url: res.secure_url,
    size: res.bytes,
    filename: originalname,
    width:  res.width,
    height:  res.height,
    resource_type:res.resource_type,
    format:res.format
  };
}


const deleteMedia = async (req, res) => {
  try {
    const { media_id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(media_id)) {
      throw new CustomError(400, 'Invalid media ID');
    }

    const media = await Media.findById(media_id);
    if (!media) {
      throw new CustomError(404, 'Media not found');
    }
    await cloudinary.uploader.destroy(media.cloudinary_id);
    await Media.findByIdAndDelete(media_id);

    ResponseHandler.success(res, { message: 'Media deleted successfully' }, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

module.exports = {
  uploadMediaToLibrary, deleteMedia
};

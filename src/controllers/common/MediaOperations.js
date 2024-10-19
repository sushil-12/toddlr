const { default: mongoose } = require('mongoose');
const Media = require('../../models/Media');
const { CustomError, ErrorHandler, ResponseHandler } = require('../../utils/responseHandler');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

const canEditPermission = async (req, domainHeader) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;
        const user = await User.findById(userId).populate('role');

        console.log(req.body)
        if (user?.role?.name === 'admin' || user?.role?.name === 'super_admin' ) {
            return true; // Admins have editing permission
        }

        const userPermittedWebsite = Object.keys(user.permissions);
        let filteredDomain = domainHeader.replace(/_/g, " ");
        const ids = await Website.find({ business_name: new RegExp(filteredDomain, 'i') }).select('_id');
        const idValues = ids.map((doc) => doc._id.toString()); //    Assuming ids are ObjectIds and converting them to strings

        // Check if any of the returned ids are in userPermittedWebsite
        for (const id of idValues) {
            if (userPermittedWebsite.includes(id)) {

                // Ensure user.permissions[id] is properly accessed
                if (user.permissions[id]) {
                    return user.permissions[id].editor_permission;
                }
            }
        }

        return false; // User doesn't have editing permission
    } catch (error) {
        console.error('Error checking user permissions:', error);
        return false; // Return false in case of any error
    }
};
const getAllMedia = async (req, res) => {
    try {
        const domainHeader = req.headers['domain'];
        let { page = 1, limit = process.env.MEDIA_PAGINATION, search, filterBy } = req.query;

        const query = { domain: domainHeader };
        if (search) {
            query.title = { $regex: new RegExp(search, 'i') };
        }
        if (filterBy) {
            query.storage_type = filterBy;
        }

        let media;
        let totalDocuments;
        if (search) {
            // Fetch all matching search results without pagination
            media = await Media.find(query).sort({ createdAt: -1 });
            page = 1;
            totalDocuments = media.length;
        } else {
            // Apply pagination
            media = await Media.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit));

            // Simulate pagination metadata
            totalDocuments = await Media.countDocuments(query);
        }

        const totalPages = Math.ceil(totalDocuments / limit);
        const can_edit = await canEditPermission(req, domainHeader);
        const mediadata = media.map((media) => ({
            id: media._id,
            title: media?.title || media?.filename || media?.originalname || 'upload file to hegroup',
            caption: media?.caption || '',
            description: media?.description || 'upload file to hegroup',
            alt_text: media?.alt_text || 'upload file to hegroup',
            filename: media?.filename || media?.originalname || 'upload file to hegroup',
            format: media?.format || (media?.resource_type ? media.resource_type + '/' + media.format : 'image/png'),
            height: media?.height || media?.height || '200',
            width: media?.width || media?.width || '500',
            cloudinary_id: media?.cloudinary_id || '',
            url: media?.url || '',
            size: media?.size,
            storage_type: 'cloudinary',
            author: media?.author || '',
            category: media?.category || '',
            tags: media?.tags || [],
            createdAt: media?.createdAt,
        }));

        const paginationInfo = {
            page: Number(page),
            limit: Number(limit),
            totalPages,
            
            totalItems: totalDocuments,
        };

        // Return the media and pagination information
        ResponseHandler.success(res, { mediadata, pagination: paginationInfo, can_edit: can_edit }, 200);
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};


const getAllImages = async (req, res) => {
    try {
        const domainHeader = req.headers['domain'];
        const images = await Media.find({ domain: domainHeader }).select('url alt_text');

        const imagesdata = images.map((media) => ({
            id: media._id,
            url: media.url,
            alt_text: media?.alt_text,
        }));

        // Return the media and pagination information
        ResponseHandler.success(res, { imagesdata }, 200);
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};

const editMedia = async (req, res) => {
    try {
        const { id } = req.body;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new CustomError(400, 'Invalid media ID');
        }

        const {
            title,
            caption,
            description,
            alt_text,
            filename,
            url,
            size,
            category,
            tags,
        } = req.body;

        const media = await Media.findById(id);

        // Check if the media item exists
        if (!media) {
            throw new CustomError(404, 'Media not found');
        }

        media.title = title || media.title;
        media.caption = caption || media.caption;
        media.description = description || media.description;
        media.alt_text = alt_text || media.alt_text;
        media.filename = filename || media.filename;
        media.url = url || media.url;
        media.size = size || media.size;
        media.category = category || media.category;
        media.tags = tags || media.tags;

        // Save the updated media item
        let updatedMedia = await media.save();
        updatedMedia = { ...updatedMedia.toObject(), id: updatedMedia._id };

        ResponseHandler.success(res, { media: updatedMedia }, 200);
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};


module.exports = {
    getAllMedia, getAllImages,
    editMedia
};

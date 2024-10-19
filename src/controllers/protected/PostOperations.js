const { default: mongoose } = require("mongoose");
const { HTTP_STATUS_CODES } = require("../../constants/error_message_codes");
const Post = require("../../models/Post");
const { CustomError, ResponseHandler, ErrorHandler } = require("../../utils/responseHandler");
const Media = require("../../models/Media");
const Category = require("../../models/Category");
const PostMeta = require("../../models/PostMeta");
const NavigationItem = require("../../models/NavigationItem");
const Domain = require("../../models/Domain");
const jwt = require('jsonwebtoken');
const User = require("../../models/User");
const Website = require("../../models/Websites");
const { createSlug, formatString } = require("../../utils/helper");
const path = require('path');
const { callDynamicFunction } = require("../../plugins/DynamicLoader");
const { logger } = require("../../logger");
const Sidebar = require("../../models/Sidebar");
const fs = require('fs').promises;

const canEditPermission = async (req, domainHeader) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;
        const user = await User.findById(userId).populate('role');

        console.log(user?.role?.name)
        if (user?.role?.name == 'admin' || user?.role?.name == 'super_admin') {
            return true; // Admins have editing permission
        }
        console.log("here")
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

const canEditThisWebsitePermission = async (req, domainHeader) => {
    try {
        console.log(req.body, domainHeader, "domainHeader")
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;
        const user = await User.findById(userId).populate('role');


        if (user?.role?.name === 'admin' || user?.role?.name == 'super_admin') {
            return true; // Admins have editing permission
        }
        console.log("USER_ROLE", user?.role?.name)

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

const generateUniqueSlug = async (title, postId = null) => {
    let baseSlug = createSlug(title);
    let uniqueSlug = baseSlug;
    let count = 1;

    // Loop to find a unique slug
    while (await Post.exists({ slug: uniqueSlug, _id: { $ne: postId } })) {
        uniqueSlug = `${baseSlug}-${count}`;
        count += 1;
    }

    return uniqueSlug;
};

const createEditPost = async (req, res) => {
    try {
        const { id } = req.body;
        const domain = req.headers['domain'];
        const can_edit = await canEditThisWebsitePermission(req, domain);
        if (!can_edit) {
            throw new CustomError(403, 'Permission denied');
        }

        const {
            title,
            content,
            post_type,
            author,
            publicationDate,
            categories,
            tags,
            featuredImage,
            status,
            comments,
            customFields,
            seoData,
            formData,
            customRepeaterFields
        } = req.body;

        const postObject = {
            title,
            post_type,
            domain,
            content,
            author,
            publicationDate,
            categories,
            tags,
            featuredImage,
            status,
            comments,
            seoData,
        };

        let post;

        if (mongoose.Types.ObjectId.isValid(id)) {
            post = await Post.findById(id);
            if (!post) {
                throw new CustomError(404, 'Post not found');
            }
        } else {
            post = new Post(postObject);
            post.author = req.userId;
            post.domain = domain;
        }

        // Generate unique slug
        const uniqueSlug = await generateUniqueSlug(title, post._id);
        post.slug = seoData.seoUrl ? await generateUniqueSlug(seoData.seoUrl, post._id) : uniqueSlug;
        post.title = title || post.title;
        post.post_type = post_type || post.post_type;
        post.content = content || post.content;
        post.publicationDate = publicationDate || post.publicationDate;
        post.categories = categories || post.categories;
        post.tags = tags || post.tags;
        post.featuredImage = featuredImage;
        post.status = status || post.status;
        post.comments = comments || post.comments;
        post.domain = domain || post.domain;
        post.seoData = seoData || post.seoData;
        post.isSeoDefault = false;

        let updatedPost = await post.save();
        updatedPost = { ...updatedPost.toObject(), id: updatedPost._id };

        const postMetaObject = {
            title: title || post.title,
            formData: formData || {},
        };

        let postMeta;

        if (post.postMeta && mongoose.Types.ObjectId.isValid(post.postMeta) && (await PostMeta.findById(post.postMeta))) {
            postMeta = await PostMeta.findByIdAndUpdate(post.postMeta, postMetaObject, { new: true });
        } else {
            postMeta = new PostMeta(postMetaObject);
            await postMeta.save();
            post.postMeta = postMeta._id;
            await post.save();
        }

        let pluginDirPath;
        if (process.env.APP_ENV == 'local') {
            pluginDirPath = path.resolve(process.cwd(), 'src/plugins/schema', domain);
        } else {
            pluginDirPath = path.resolve(process.cwd(), 'backend/src/plugins/schema', domain);
        }

        let pluginFilePath;

        if (!seoData.seoFilePath || seoData.seoFilePath === '' || seoData.seoFilePath === 'select' || seoData.seoFilePath === undefined) {
            const generatedSlug = uniqueSlug;
            pluginFilePath = path.join(pluginDirPath, `${generatedSlug}.js`);
            post.seoData.seoFilePath = `${generatedSlug}.js`;
            await post.save();
        } else {
            pluginFilePath = path.join(pluginDirPath, seoData.seoFilePath);
        }

        let dirCreated = true;
        try {
            const stats = await fs.stat(pluginDirPath);
            if (!stats.isDirectory()) {
                dirCreated = false;
            }
        } catch (error) {
            dirCreated = false;
        }

        let fileExists = true;
        try {
            await fs.access(pluginFilePath);
        } catch (error) {
            fileExists = false;
        }

        if (!dirCreated || !fileExists) {
            let updatedData = post.seoData;
            updatedData.seoFilePath = 'default';
            post.seoData = updatedData;
            post.isSeoDefault = true;
            await post.save();
        }

        ResponseHandler.success(res, { post: updatedPost, postMeta }, mongoose.Types.ObjectId.isValid(id) ? HTTP_STATUS_CODES.OK : HTTP_STATUS_CODES.CREATED);
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};



const getPostById = async (req, res) => {
    try {
        const postId = req.params.post_id;
        console.log(postId);
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            throw new CustomError(400, 'Invalid post ID');
        }

        const post = await Post.findById(postId).populate({
            path: 'postMeta',
            model: 'PostMeta',
            match: { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] } // Fetch postMeta entries where isDeleted is false or does not exist
        });


        if (!post) {
            throw new CustomError(404, 'Post not found');
        }

        const domain = req.headers['domain'];
        const can_edit = await canEditPermission(req, domain);

        const featuredImageId = post.featuredImage;
        const categoryIds = post?.categories || [];

        console.log(post?.seoData?.seoUrl, "=========================================");
        if (post?.seoData?.seoUrl == '' || post?.seoData?.seoUrl === undefined) {
            post.seoData.seoUrl = post?.slug;
        }

        let seoContent = '';
        try {
            if (post?.seoData?.seoFilePath && post.seoData.seoFilePath !== '') {
                seoContent = await callDynamicFunction(domain, post.seoData.seoFilePath, 'generateJsonLd', post.isSeoDefault, postId);
            }
        } catch (seoError) {
            seoContent = seoError.message
            logger.error(`404 - ${seoError.message}`); // Log error message
        }

        const categoryObject = categoryIds.reduce((acc, categoryId) => {
            acc[categoryId] = true;
            return acc;
        }, {});

        if (featuredImageId && mongoose.Types.ObjectId.isValid(featuredImageId)) {
            const media = await Media.findById(featuredImageId).select('url alt_text').lean();
            media.id = media._id;
            delete media._id;
            const updatedPost = {
                ...post.toObject(),
                id: post._id,
                featuredImage: media,
                seoContent,
                categoryObject: categoryObject,
                can_edit
            };
            ResponseHandler.success(res, { post: updatedPost }, 200);
        } else {
            const updatedPost = {
                ...post.toObject(),
                id: post._id,
                categoryObject: categoryObject,
                seoContent,
                can_edit
            };
            ResponseHandler.success(res, { post: updatedPost }, 200);
        }
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};

const getAllPosts = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;
        const { page = 1, limit = 10, search, filter } = req.query;
        const user = await User.findById(userId).populate('role');
        const userPermittedWebsite = user.permissions !== undefined && user.permissions !== null ? Object.keys(user.permissions) : {};
        const domainHeader = req.headers['domain'];
        let can_edit = true;
        console.log(formatString(domainHeader), "DOMAIN HEADER");

        if (user?.role?.name !== 'admin' && user?.role?.name !== 'super_admin') {
            const id = await Website.findOne({ business_name: new RegExp(formatString(domainHeader), 'i') }).select('_id');
            console.log(id, "CAN EDIT");
            if (id !== null) {
                if (userPermittedWebsite.includes(id._id.toString())) {
                    can_edit = user.permissions[id._id].editor_permission;
                }
            }
        }

        const { post_type } = req.params;
        const query = {};

        if (search && search !== '') {
            query.$or = [
                { title: { $regex: new RegExp(search, 'i') } },
                { content: { $regex: new RegExp(search, 'i') } },
            ];
        }


        if (filter && filter !== 'All') {
            switch (filter) {
                case 'trash':
                    query.status = 'trash';
                    break;
                case 'draft':
                    query.status = 'draft';
                    break;
                case 'published':
                    query.status = 'published';
                    break;
                default:
                    break;
            }
        }
        let postsPromise;
        if (search) {
            postsPromise = Post.find(query)
                .where('post_type').equals(post_type)
                .where('deleted').equals(false)
                .where('domain').equals(domainHeader)
                .sort({ publicationDate: -1 })
                .exec();
        } else {
            postsPromise = Post.find(query)
                .where('post_type').equals(post_type)
                .where('deleted').equals(false)
                .where('domain').equals(domainHeader)
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit))
                .sort({ publicationDate: -1 })
                .exec();
        }


        const publishedCountPromise = Post.countDocuments({ post_type, domain: domainHeader, status: 'published', deleted: false });
        const draftCountPromise = Post.countDocuments({ post_type, domain: domainHeader, status: 'draft', deleted: false });
        const allPostsCountPromise = Post.countDocuments({ post_type, domain: domainHeader, deleted: false });

        const [posts, publishedCount, draftCount, allPostsCount] = await Promise.all([postsPromise, publishedCountPromise, draftCountPromise, allPostsCountPromise]);

        const postIds = posts.filter(post => post.featuredImage).map(post => post.featuredImage);
        const images = await Media.find({ _id: { $in: postIds } }).select('url alt_text');
        const imagesData = images.map(media => ({
            id: media._id,
            url: media.url,
            alt_text: media.alt_text,
        }));

        const formattedPosts = await Promise.all(posts.map(async (post) => {
            const categories = await Promise.all(post.categories.map(async (item) => {
                try {
                    const category = await Category.findById(item).exec();
                    return category ? category.name : null;
                } catch (error) {
                    console.error(`Error fetching category with ID ${item}:`, error);
                    return null;
                }
            }));

            return {
                ...post._doc,
                id: post._id,
                images: imagesData.filter(img => img.id === post.featuredImage),
                categories,
            };
        }));

        const totalPages = Math.ceil(allPostsCount / limit);

        ResponseHandler.success(res, {
            posts: formattedPosts,
            totalCount: allPostsCount,
            draft_posts: draftCount,
            published_posts: publishedCount,
            can_edit,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages,
                totalItems: filter == 'draft' ? draftCount : filter == 'trash' ? trashCount : filter == 'published' ? publishedCount : allPostsCount
            }
        }, 200);
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};
function findItemsByKey(data, key) {
    return data[key];
}
const getAllPostTypesAndPages = async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const domainHeader = req.headers['domain'];
        const { type } = req.params;
        const query = {};

        if (search) {
            query.$or = [
                { title: { $regex: new RegExp(search, 'i') } },
                { content: { $regex: new RegExp(search, 'i') } },
            ];
        }

        const domain = await Domain.findOne({ name: domainHeader });
        const domain_id = domain ? domain._id : null;
        let posts;

        if (type === 'page') {
            posts = await Post.find()
                .where('post_type').equals('page')
                .where('domain').equals(domainHeader)
                .limit(parseInt(limit))
                .select('title');
        } else {
            let business_name = formatString(domainHeader)
            const sidebar = await Website.find({
                business_name: {
                    $regex: new RegExp(`^${business_name}$`, 'i')
                }
            });

            console.log(sidebar[0].menus, business_name, "WEb")

            posts = sidebar[0].menus
                .filter(item => item.type === 'custom_post')
            // Selecting only the 'label' field
        }
        console.log(posts)

        // Transform the posts array if needed
        const transformedPosts = posts.map(item => ({
            value: type === 'page' ? item._id : createSlug(item.label),
            label: item.label || item.title,
        }));

        const totalCount = await Post.countDocuments(query);

        ResponseHandler.success(res, { posts: transformedPosts, totalCount, currentPage: parseInt(page) }, 200);
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};


const deletePost = async (req, res) => {
    try {
        const { post_id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(post_id)) {
            throw new CustomError(400, 'Invalid media ID');
        }

        const post = await Post.findById(post_id);
        if (!post) {
            throw new CustomError(404, 'Media not found');
        }
        post.deleted = true;
        await post.save();

        ResponseHandler.success(res, { message: 'Post deleted successfully' }, 200);
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};

const quickEditPost = async (req, res) => {
    try {
        const { post_id } = req.params;
        const { title, slug, publicationDate, status, sticky } = req.body;

        if (!mongoose.Types.ObjectId.isValid(post_id)) {
            throw new CustomError(400, 'Invalid post ID');
        }

        const post = await Post.findById(post_id);

        if (!post) {
            throw new CustomError(404, 'Post not found');
        }

        if (title) {
            post.title = title;
        }
        const uniqueSlug = await generateUniqueSlug(slug, post_id);
        if (slug) {
            post.slug = uniqueSlug;
        }
        post.sticky = sticky;
        const allowedStatuses = ['draft', 'published', 'trash', 'archived'];

        if (status && allowedStatuses.includes(status)) {
            post.status = status;
        }
        if (publicationDate) {
            post.publicationDate = publicationDate;
        }

        await post.save();

        ResponseHandler.success(res, { message: 'Post updated successfully' }, 200);
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};

const listFiles = async (req, res) => {
    try {
        const domain = req.headers['domain'];
        if (!domain) {
            throw new CustomError(400, 'Domain Header not found');
        }
        let folderPath = '';
        if (process.env.APP_ENV == 'local') {
            folderPath = path.resolve(process.cwd(), 'src/plugins/schema', domain);
        } else {
            folderPath = path.resolve(process.cwd(), 'backend/src/plugins/schema', domain);
        }


        console.log(`Folder Path: ${folderPath}`);

        // Check if the directory exists
        let files = [];
        try {
            files = await fs.readdir(folderPath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Directory does not exist
                console.log(`Directory ${folderPath} does not exist`);
            } else {
                throw error; // Propagate other errors
            }
        }

        ResponseHandler.success(res, { files }, 200);

    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
}


module.exports = {
    createEditPost, getPostById, getAllPosts, listFiles, deletePost, quickEditPost, getAllPostTypesAndPages
};
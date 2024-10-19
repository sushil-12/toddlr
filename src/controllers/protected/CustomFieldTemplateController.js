const { default: mongoose } = require("mongoose");
const { ResponseHandler, ErrorHandler, CustomError } = require("../../utils/responseHandler");
const CustomField = require("../../models/CustomFields");
const { HTTP_STATUS_CODES } = require("../../constants/error_message_codes");
const { createSlug } = require("../../utils/helper");
const Post = require("../../models/Post");
const PostMeta = require("../../models/PostMeta");

// interface Field {
//     field_type: string;
//     label: string;
//     name: string;
//     options: string[];
//     repeatable: boolean;
//     required: boolean;
//     nestedFields?: Field[]; // For nested fields
// }

const createEditCustomField = async (req, res) => {
    try {
        const { id } = req.body;
        const domain = req.headers['domain'];
        const { title, post_type, item_type, customFields } = req.body;

        // Check if the post_type is already in use
        const existingCustomField = await CustomField.findOne({ post_type, domain });

        if (existingCustomField && (!id || existingCustomField._id.toString() !== id)) {
            throw new CustomError(400, 'We already have custom fields for this post type!');
        }

        // Filter out fields with an empty label
        const filteredCustomFields = customFields.filter(field => field.label && field.label.trim() !== '');

        const customFieldObject = {
            title,
            post_type,
            item_type,
            domain,
            fields: filteredCustomFields.map((field) => ({
                name: createSlug(field.label, '_') || '',
                label: field.label || '',
                variant: field.variant || '',
                required: field.required || false,
                field_type: field.field_type !== '' ? field.field_type : null,
                placeholder: field.placeholder || '',
                options: field.options || [],
                repeatable: field.repeatable || false,
                nestedFields: field.nestedFields || null // For nested fields
            })),
        };

        let customField;

        if (mongoose.Types.ObjectId.isValid(id)) {
            customField = await CustomField.findById(id);
            if (!customField) {
                throw new CustomError(404, 'CustomField not found');
            }
        } else {
            customField = new CustomField(customFieldObject);
        }

        // Update or set fields based on the request body
        customField.title = title || customField.title;

        // Replace existing fields with the new filtered fields
        customField.fields = customFieldObject.fields;
        customField.post_type = post_type;
        customField.item_type = item_type;

        let updatedCustomField = await customField.save();
        updatedCustomField = { ...updatedCustomField.toObject(), id: updatedCustomField._id };

        ResponseHandler.success(res, { customField: updatedCustomField }, mongoose.Types.ObjectId.isValid(id) ? HTTP_STATUS_CODES.OK : HTTP_STATUS_CODES.CREATED);
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};

const getAllCustomField = async (req, res) => {
    try {
        const postType = req.params.post_type;
        const pageId = req.query.pageId || null;
        const domain = req.headers['domain'];
        let allCustomField = [];

        // Handle 'all' post types
        if (postType === 'all') {
            allCustomField = await CustomField.find({
                domain,
                $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
            }).sort({ createdAt: -1 });

        } else if (postType === 'page') {
            // Handle specific 'page' post type with a pageId
            if (pageId) {
                allCustomField = await CustomField.find({
                    item_type: postType,
                    post_type: pageId,
                    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
                }).sort({ createdAt: -1 });
            }

        } else {
            // Handle all other post types
            allCustomField = await CustomField.find({
                post_type: postType,
                $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
            }).sort({ createdAt: -1 });
        }

        // Process the data to add titles and postMeta for 'item_type' === 'page'
        if (allCustomField.length > 0) {
            allCustomField = await Promise.all(allCustomField.map(async (item) => {
                if (item.item_type === 'page') {
                    const post = await Post.findById(item.post_type).select('title postMeta');

                    // Fetch postMeta if it exists
                    let postMeta = null;
                    if (post?.postMeta) {
                        postMeta = await PostMeta.findById(post.postMeta);
                    }

                    let updatedFields = item.fields.map((field) => {
                        const matchingMeta = postMeta?.formData?.find(meta => meta.name === field.name);
                        if (matchingMeta) {
                            // Add value from postMeta to the field object
                            return {
                                name: field.name,
                                label: field.label,
                                field_type: field.field_type,
                                required: field.required,
                                options: field.options,
                                value: matchingMeta.value,
                                nestedFields: field.nestedFields // Keep nested fields as is
                            };
                        }
                        return {
                            name: field.name,
                            label: field.label,
                            field_type: field.field_type,
                            required: field.required,
                            options: field.options,
                            nestedFields: field.nestedFields // Keep nested fields as is
                        };  // Return field as is if no match
                    });

                    // Return the custom field along with postTitle and newFields
                    return { 
                        ...item._doc, 
                        postTitle: post?.title || null, 
                        fields: updatedFields
                    };
                }
                return item;  // Return the custom field as is if not a 'page' type
            }));
        }

        // Return response with the processed data
        ResponseHandler.success(res, { customField: allCustomField }, HTTP_STATUS_CODES.OK);

    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};

const getCustomFieldById = async (req, res) => {
    try {
        const customFieldId = req.params.custom_field_id;
        if (!mongoose.Types.ObjectId.isValid(customFieldId)) {
            throw new CustomError(400, 'Invalid post ID');
        }

        const customField = await CustomField.findById(customFieldId);
        if (!customField) {
            throw new CustomError(404, 'CustomField not found');
        }

        const customFieldData = {
            id: customField._id,
            title: customField.title,
            fields: customField.fields,
            domain: customField.domain,
            post_type: customField.post_type,
        };

        ResponseHandler.success(res, customFieldData, 200);
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};
const deleteCustomField = async (req, res) => {
    try {
        const customFieldId = req.params.custom_field_id;

        // Validate the custom field ID
        if (!mongoose.Types.ObjectId.isValid(customFieldId)) {
            throw new CustomError(400, 'Invalid custom field ID');
        }

        // Soft delete the custom field by setting isDeleted to true
        const customField = await CustomField.findByIdAndUpdate(
            customFieldId,
            { isDeleted: true }, // Soft delete
            { new: true }
        );

        if (!customField) {
            throw new CustomError(404, 'CustomField not found');
        }

        // Extract the post type and item type
        const postId = customField?.post_type;
        const itemType = customField?.item_type;

        let posts;

        // Fetch the postMeta associated with the post, based on item type
        if (itemType === 'page') {
            posts = await Post.findById(postId).select('postMeta'); // For pages (single post)
            if (posts?.postMeta) {
                await softDeletePostMeta(posts.postMeta);
            }
        } else {
            posts = await Post.find({ post_type: postId }).select('postMeta'); // For other types (array of posts)

            // Loop through each post and soft delete the associated postMeta if it exists
            if (posts.length > 0) {
                for (const post of posts) {
                    if (post?.postMeta) {
                        await softDeletePostMeta(post.postMeta);
                    }
                }
            }
        }

        ResponseHandler.success(res, { message: 'CustomField and associated PostMeta (if present) deleted successfully.' }, 200);
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};

// Helper function to soft delete postMeta
async function softDeletePostMeta(postMetaId) {
    const postMetaUpdate = await PostMeta.findByIdAndUpdate(
        postMetaId,
        { isDeleted: true }, // Soft delete
        { new: true }
    );

    if (!postMetaUpdate) {
        throw new CustomError(404, 'PostMeta not found');
    }
}


module.exports = { createEditCustomField, getAllCustomField, getCustomFieldById, deleteCustomField };

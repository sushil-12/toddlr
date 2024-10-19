const jwt = require('jsonwebtoken');
const fs = require('fs');
const handlebars = require('handlebars');
const { Readable } = require('stream');
const User = require('../../models/User');
const { CustomError, ErrorHandler, ResponseHandler } = require('../../utils/responseHandler');
const Permission = require('../../models/Permission');
const Role = require('../../models/Role');
const { HTTP_STATUS_CODES } = require('../../constants/error_message_codes');
const path = require('path');
const Sidebar = require('../../models/Sidebar');
const AuthValidator = require('../../validator/AuthValidator');
const cloudinary = require('../../config/cloudinary');
const Website = require('../../models/Websites');
const Post = require('../../models/Post');
const { createSlug } = require("../../utils/helper");



const createOrEditWebsite = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const created_by = decodedToken.userId;

        const { icon, business_name, url, description, id, menus } = req.body; // Extract website data from request body

        if (id) {
            // Edit website if id is provided
            const existingWebsite = await Website.findById(id);
            if (!existingWebsite) {
                return ResponseHandler.error(res, { message: 'Website not found' }, HTTP_STATUS_CODES.NOT_FOUND);
            }

            // Update the website fields
            existingWebsite.business_name = business_name;
            existingWebsite.url = url;
            existingWebsite.description = description;
            existingWebsite.created_by = created_by;
            if (menus) {
                existingWebsite.menus = menus;
            }

            if(icon == ''){
                existingWebsite.icon = '';
            }

            if (icon) {
                const base64String = icon;
                const buffer = Buffer.from(base64String, 'base64');
                const readableStream = new Readable();
                readableStream.push(buffer);
                readableStream.push(null);

                // Upload the profile picture to cloudinary
                const uploadPromise = new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream({ folder: 'profile_pictures' },
                        (error, result) => {
                            if (error) {
                                console.error('Upload error:', error);
                                reject(error);
                            } else {
                                existingWebsite.icon = result.secure_url;
                                console.log('Uploaded profile pic:', result.secure_url);
                                resolve();
                            }
                        }
                    );

                    readableStream.pipe(uploadStream);
                });

                await uploadPromise;
            }

            await existingWebsite.save();
            ResponseHandler.success(res, { message: 'Website updated successfully' }, HTTP_STATUS_CODES.OK);
        } else {
            // Create new website if id is not provided
            const newWebsite = new Website({
                icon,
                business_name,
                url,
                description,
                menus,
                created_by
            });
            if (icon) {
                const base64String = icon;
                const buffer = Buffer.from(base64String, 'base64');
                const readableStream = new Readable();
                readableStream.push(buffer);
                readableStream.push(null);

                // Upload the profile picture to cloudinary
                const uploadPromise = new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream({ folder: 'profile_pictures' },
                        (error, result) => {
                            if (error) {
                                console.error('Upload error:', error);
                                reject(error);
                            } else {
                                newWebsite.icon = result.secure_url;
                                console.log('Uploaded profile pic:', result.secure_url);
                                resolve();
                            }
                        }
                    );

                    readableStream.pipe(uploadStream);
                });

                await uploadPromise;
            }

            // Save the website
            await newWebsite.save();

            ResponseHandler.success(res, { message: 'Website created successfully' }, HTTP_STATUS_CODES.OK);
        }
    } catch (error) {
        // Handle errors
        ErrorHandler.handleError(error, res);
    }
};

const listWebsites = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, filterBy } = req.query;

        const query = {};
        if (search) {
            query.business_name = { $regex: new RegExp(search, 'i') };
        }
        const websites = await Website.find(query).select('icon business_name description url');
        const websitesData = websites.map(website => ({
            id: website._id,
            ...website._doc, // Spread the remaining fields from the document
        }));
        // Return the list of websites
        ResponseHandler.success(res, { websites: websitesData }, HTTP_STATUS_CODES.OK);
    } catch (error) {
        // Handle errors
        ErrorHandler.handleError(error, res);
    }
};

const listWebsitesWithMenus = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;
        const websites = await Website.find({}, 'icon business_name description url menus'); // Limit fields to be retrieved
        const user = await User.findById(userId).populate('role');
        const userPermittedWebsite = user.permissions ? Object.keys(user.permissions) : [];

        const websitesData = websites.map(website => ({
            id: website._id,
            ...website._doc, // Spread the remaining fields from the document
        }));

        let websitesList = [];
        
        if (user?.role?.name !== 'admin' && user?.role?.name !== 'super_admin') {
            const filteredWebsites = websitesData?.filter((website) => userPermittedWebsite.includes(website._id.toHexString()));
            websitesList = filteredWebsites;
        } else {
            websitesList = websitesData;
        }
        ResponseHandler.success(res, { websites: websitesList }, HTTP_STATUS_CODES.OK);

    } catch (error) {
        // Handle errors
        ErrorHandler.handleError(error, res);
    }
};

const getWebsite = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const website_id = req.params.website_id;
        const website = await Website.findById(website_id);
        if (!website) {
            throw new CustomError(404, 'User not found');
        }


        const websiteData = {
            id: website._id,
            ...website._doc
        };

        ResponseHandler.success(res, websiteData, 200);
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};

const deleteWebsite = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const website_id = req.params.website_id;

        // Find the website by ID
        const website = await Website.findById(website_id);
        if (!website) {
            throw new CustomError(404, 'Website not found');
        }

        const deletedWebsiteName = website.business_name;

        // Delete the website
        await Website.findByIdAndDelete(website_id);
        await Post.deleteMany({ domain: createSlug(deletedWebsiteName, '_') });

        // Respond with success message
        ResponseHandler.success(res, { message: 'Website and related posts deleted successfully' }, 200);
    } catch (error) {
        ErrorHandler.handleError(error, res);
    }
};


module.exports = {
    createOrEditWebsite, listWebsites, getWebsite, listWebsitesWithMenus, deleteWebsite
};
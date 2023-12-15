import {connection} from "../utils/db.js";
import cafeModel from "../models/cafe.js";
import multer from "multer";
// import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import sharp from "sharp";
// import crypto from "crypto";
//
// const bucketName = process.env.AWS_BUCKET_NAME
// const region = process.env.AWS_BUCKET_REGION
// const accessKeyId = process.env.AWS_ACCESS_KEY_ID
// const secretAccessKey = process.env.AWS_SECRET_KEY
//
// const s3Client = new S3Client({
//     region,
//     credentials: {
//         accessKeyId,
//         secretAccessKey
//     }
// })

const PAGE_SIZE = 6;
const storage = multer.memoryStorage();
const upload = multer({storage: storage})

export const uploadProductImage = upload.fields([{name: 'main_image', maxCount: 1}]);

const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex')

export const cafeAddToFavorite = async (req, res) => {
    const {
        cafeId,
        userId
    } = req.body;

    console.log("req.body: ", req.body)
    try {
        const query = "INSERT INTO `user_favorite_cafe` (`cafe_id`, `user_id`) VALUES (?, ?)";
        const [results] = await connection.query(query, [cafeId, userId]);
        return res.status(200).json(results);
    } catch (err) {
        console.log(err);
        return res.status(500).json({error: "Failed to add to favorite"});
    }
}

export const cafeCreate = async (req, res) => {
    const {
        name,
        city,
        address,
        lat,
        lng,
        main_image,
        opening_hours,
        phone,
        description,
        place_id,
        tags
    } = req.body;

    try {
        const cafe = await cafeModel.createCafe({
            name,
            city,
            address,
            lat,
            lng,
            main_image,
            opening_hours,
            phone,
            description,
            place_id,
            tags
        });
        return res.status(200).json(cafe);

    } catch (err) {
        console.log(err);
        return res.status(500).json({error: "Failed to create cafe"});
    }

    // if (!req.files) {
    //     return res.status(400).json({error: "No files were uploaded."});
    // }
    // const file = req.files['main_image'][0];
    // const fileBuffer = await sharp(file.buffer)
    //     .resize({ height: 1920, width: 1080, fit: "contain" })
    //     .toBuffer()
    // const fileName = generateFileName();
    // const uploadParams = {
    //     Bucket: bucketName,
    //     Body: fileBuffer,
    //     Key: fileName,
    //     ContentType: file.mimetype,
    // };
    // console.log(file);

    // try {
    //     await s3Client.send(new PutObjectCommand(uploadParams));
    //     const imagePath = await getSignedUrl(
    //         s3Client,
    //         new GetObjectCommand({
    //             Bucket: bucketName,
    //             Key: fileName
    //         }),
    //     )
    //     console.log('File uploaded to S3 successfully. Location: ', uploadResult.Location);
    //
    // } catch (error) {
    //     console.log('Error uploading file to S3: ', error);
    //     return res.status(500).json({error: "Error uploading to S3"});
    // }
};

export const cafeUpdate = async (req, res) => {
    const {
        name,
        city,
        district,
        email,
        phone,
        instagram,
        facebook,
        description,
        tags
    } = req.body;

    try {
        const cafe = await cafeModel.updateCafe(req.params.cafeId, {
            name,
            city,
            district,
            email,
            phone,
            instagram,
            facebook,
            description,
            tags
        });


        return res.status(200).json(cafe);

    } catch (err) {
        console.log(err);
        return res.status(500).json({error: "Failed to update cafe"});
    }
}

export const cafeDelete = async (req, res) => {
    try {
        const cafe = await cafeModel.deleteCafe(req.params.cafeId);
        return res.status(200).json(cafe);
    } catch (err) {
        console.log(err);
        return res.status(500).json({error: "Failed to delete cafe"});
    }
}

export const cafeDetails = async (req, res) => {
    const cafeId = req.params.cafeId;
    console.log("cafeId: ", cafeId);
    try {

        let baseQuery = `
            SELECT *
            FROM cafe
            WHERE id = ?
        `;
        let tagsQuery = 'SELECT t.name FROM cafe_tags ct JOIN cafe_tag t ON ct.tag_id = t.id WHERE ct.cafe_id = ?';
        let reviewsQuery = 'SELECT * FROM review WHERE cafe_id = ?';

        const [baseResults, tagsResults, reviewsResults] = await Promise.all([
            connection.query(baseQuery, [cafeId]),
            connection.query(tagsQuery, [cafeId]),
            connection.query(reviewsQuery, [cafeId])
        ]);
        const cafes = baseResults[0];
        const tags = tagsResults[0];
        const reviews = reviewsResults[0];
        // console.log("business_hour: ", cafes[0].business_hour);


        if (cafes.length > 0) {
            const cafe = cafes[0];
            cafe.tags = tags;
            cafe.reviews = reviews;
            cafe.avg_star = cafe.reviews.reduce((acc, review) => acc + review.star, 0) / (cafe.reviews.length || 1);

            // console.log("return cafe details: ", cafe)
            return res.status(200).json(cafe);
        } else {
            return res.status(404).json({message: "Cafe not found"});
        }
    } catch (err) {
        console.log(err);
        throw new Error(err);
    }
}

export function paginationMiddleware(req, res, next) {
    const page = parseInt(req.query.paging) || 1;

    if (isNaN(page) || page <= 0) {
        return res.status(400).json({error: 'Invalid page number.'});
    }

    req.pagination = {
        page: page,
        offset: (page - 1) * PAGE_SIZE
    };
    next();
}

export const cafeList = async (req, res) => {
    const page = parseInt(req.pagination.page);
    const offset = parseInt(req.pagination.offset);
    const keyword = req.query.keyword || '';
    const cityFilter = req.query.city ? req.query.city.split(',') : [];
    const tagFilter = req.query.tag ? req.query.tag.split(',') : [];
    const sortOption = req.query.sort; // Sorting option

    console.log("cafe list keyword: ", keyword)
    console.log("cafe list cityFilter: ", cityFilter)
    console.log("cafe list tagFilter: ", tagFilter)
    console.log("cafe list sortOption: ", sortOption)

    const keywordLike = '%' + keyword + '%';
    try {
        // Construct the base query
        let query = `
            SELECT cafe.*,
                   GROUP_CONCAT(DISTINCT cafe_tag.name) AS tag_names,
                   COUNT(DISTINCT review.id) AS total_reviews,
                   ROUND(AVG(review.star), 1) AS average_star
            FROM cafe
                     LEFT JOIN cafe_tags ON cafe.id = cafe_tags.cafe_id
                     LEFT JOIN cafe_tag ON cafe_tags.tag_id = cafe_tag.id
                     LEFT JOIN review ON cafe.id = review.cafe_id
            WHERE (cafe.name LIKE ? OR cafe.description LIKE ?)
        `;


        // Add city filter condition
        if (cityFilter[0] && cityFilter.length) {
            cityFilter.map((city, idx) => {
                if (idx === 0) {
                    query += ` AND (cafe.city = '${city}'`;
                } else {
                    query += ` OR cafe.city = '${city}'`;
                }
            });
            query += ')';
        }

        // Add tag filter condition
        // if (tagFilter[0] && tagFilter.length) {
        //     query += ` AND cafe_tag.name IN (${tagFilter.map(tag => `'${tag}'`).join(', ')})`;
        // }

        if (tagFilter.length > 0) {
            const tagConditions = tagFilter.map(tag => `'${tag}'`).join(', ');
            query += `
                AND cafe.id IN (
                    SELECT cafe_id
                    FROM cafe_tags
                    JOIN cafe_tag ON cafe_tags.tag_id = cafe_tag.id
                    WHERE cafe_tag.name IN (${tagConditions})
                    GROUP BY cafe_id
                    HAVING COUNT(DISTINCT cafe_tag.name) = ${tagFilter.length}
                )
            `;
        }

        // Add GROUP BY
        query += ` GROUP BY cafe.id`;

        // 使用 HAVING 子句确保每个咖啡馆至少匹配所有标签
        query += ` HAVING COUNT(DISTINCT cafe_tag.name) >= ${tagFilter.length}`;


        // Add sorting
        if (sortOption) {
            query += ` ORDER BY ${sortOption} DESC`;
        }

        console.log("query: ", query)

        // Add pagination
        query += ` LIMIT 6 OFFSET ?`;
        // Execute the query
        const [cafes] = await connection.query(query, [keywordLike, keywordLike, offset]);
        // console.log("cafes: ", cafes);

        // Query for total results for pagination
        const totalQuery = 'SELECT COUNT(DISTINCT cafe.id) AS total FROM cafe WHERE `name` LIKE ? OR `description` LIKE ?';
        const [totalResults] = await connection.query(totalQuery, [keywordLike, keywordLike]);
        const total = totalResults[0].total;
        const totalPages = Math.ceil(total / PAGE_SIZE);


        let response = {
            cafes,
            total_pages: totalPages,
            current_page: page,
            next_paging: (cafes.length === PAGE_SIZE && page < totalPages) ? page + 1 : null
        };

        // console.log("response: ", response)
        res.status(200).json(response);

    } catch (err) {
        console.log(err);
        return res.status(500).json({message: "Failed to get cafes"});
    }
}


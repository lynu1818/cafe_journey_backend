import { connection } from "../utils/db.js";
import cafeModel from "../models/cafe.js";
import multer from "multer";

const PAGE_SIZE = 6;
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

export const uploadProductImage = upload.fields([{ name: 'main_image', maxCount: 1 }]);

export const cafeAddToFavorite = async (req, res) => {
    const { cafeId, userId } = req.body;
    try {
        const query = "INSERT INTO user_favorite_cafe (cafe_id, user_id) VALUES ($1, $2)";
        const results = await connection.query(query, [cafeId, userId]);
        return res.status(200).json(results.rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to add to favorite" });
    }
};

export const cafeCreate = async (req, res) => {
    const { name, city, address, lat, lng, main_image, opening_hours, phone, description, place_id, tags } = req.body;
    try {
        const cafe = await cafeModel.createCafe({ name, city, address, lat, lng, main_image, opening_hours, phone, description, place_id, tags });
        return res.status(200).json(cafe);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create cafe" });
    }
};

export const cafeUpdate = async (req, res) => {
    const { name, city, district, email, phone, instagram, facebook, description, tags } = req.body;
    try {
        const cafe = await cafeModel.updateCafe(req.params.cafeId, { name, city, district, email, phone, instagram, facebook, description, tags });
        return res.status(200).json(cafe);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to update cafe" });
    }
};

export const cafeDelete = async (req, res) => {
    try {
        const cafe = await cafeModel.deleteCafe(req.params.cafeId);
        return res.status(200).json(cafe);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to delete cafe" });
    }
};

export const cafeDetails = async (req, res) => {
    const cafeId = req.params.cafeId;
    try {
        const baseQuery = `SELECT * FROM cafe WHERE id = $1`;
        const tagsQuery = `SELECT t.name FROM cafe_tags ct JOIN cafe_tag t ON ct.tag_id = t.id WHERE ct.cafe_id = $1`;
        const reviewsQuery = `SELECT * FROM review WHERE cafe_id = $1`;

        const [baseResults, tagsResults, reviewsResults] = await Promise.all([
            connection.query(baseQuery, [cafeId]),
            connection.query(tagsQuery, [cafeId]),
            connection.query(reviewsQuery, [cafeId])
        ]);

        const cafe = baseResults.rows[0];
        if (cafe) {
            cafe.tags = tagsResults.rows;
            cafe.reviews = reviewsResults.rows;
            cafe.avg_star = cafe.reviews.reduce((acc, review) => acc + review.star, 0) / (cafe.reviews.length || 1);
            return res.status(200).json(cafe);
        } else {
            return res.status(404).json({ message: "Cafe not found" });
        }
    } catch (err) {
        console.error(err);
        throw new Error(err);
    }
};

export function paginationMiddleware(req, res, next) {
    const page = parseInt(req.query.paging) || 1;
    if (isNaN(page) || page <= 0) {
        return res.status(400).json({ error: 'Invalid page number.' });
    }
    req.pagination = {
        page,
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
    const sortOption = req.query.sort;

    const keywordLike = `%${keyword}%`;

    try {
        let query = `
            SELECT cafe.*, 
                   STRING_AGG(DISTINCT cafe_tag.name, ',') AS tag_names, 
                   COUNT(DISTINCT review.id) AS total_reviews,
                   ROUND(AVG(review.star), 1) AS average_star
            FROM cafe
            LEFT JOIN cafe_tags ON cafe.id = cafe_tags.cafe_id
            LEFT JOIN cafe_tag ON cafe_tags.tag_id = cafe_tag.id
            LEFT JOIN review ON cafe.id = review.cafe_id
            WHERE (cafe.name ILIKE $1 OR cafe.description ILIKE $2)
        `;

        const params = [keywordLike, keywordLike];
        let paramIndex = 3;

        if (cityFilter.length > 0) {
            query += ` AND (` + cityFilter.map((_, i) => `cafe.city = $${paramIndex + i}`).join(' OR ') + `)`;
            params.push(...cityFilter);
            paramIndex += cityFilter.length;
        }

        if (tagFilter.length > 0) {
            const tagParams = tagFilter.map((_, i) => `$${paramIndex + i}`).join(', ');
            query += `
                AND cafe.id IN (
                    SELECT cafe_id
                    FROM cafe_tags
                    JOIN cafe_tag ON cafe_tags.tag_id = cafe_tag.id
                    WHERE cafe_tag.name IN (${tagParams})
                    GROUP BY cafe_id
                    HAVING COUNT(DISTINCT cafe_tag.name) = ${tagFilter.length}
                )
            `;
            params.push(...tagFilter);
            paramIndex += tagFilter.length;
        }

        query += ` GROUP BY cafe.id`;

        if (tagFilter.length > 0) {
            query += ` HAVING COUNT(DISTINCT cafe_tag.name) >= ${tagFilter.length}`;
        }

        if (sortOption) {
            query += ` ORDER BY ${sortOption} DESC`;
        }

        query += ` LIMIT ${PAGE_SIZE} OFFSET $${paramIndex}`;
        params.push(offset);

        const cafes = await connection.query(query, params);

        const totalQuery = `SELECT COUNT(DISTINCT cafe.id) AS total FROM cafe WHERE name ILIKE $1 OR description ILIKE $2`;
        const totalResults = await connection.query(totalQuery, [keywordLike, keywordLike]);
        const total = totalResults.rows[0].total;
        const totalPages = Math.ceil(total / PAGE_SIZE);

        const response = {
            cafes: cafes.rows,
            total_pages: totalPages,
            current_page: page,
            next_paging: (cafes.rows.length === PAGE_SIZE && page < totalPages) ? page + 1 : null
        };

        res.status(200).json(response);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to get cafes" });
    }
};

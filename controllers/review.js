import { connection } from "../utils/db.js";
import reviewModel from "../models/review.js";
import multer from "multer";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import crypto from "crypto";
import { paginationMiddleware } from "./cafe.js";

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const PAGE_SIZE = 6;

const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

export const uploadReviewPhotos = upload.fields([{ name: "photo_url", maxCount: 10 }]);

const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

export const reviewCreate = async (req, res) => {
    const { star, content, cafeId, userId } = req.body;

    try {
        const review = await reviewModel.createReview({
            star,
            content,
            cafe_id: cafeId,
            user_id: userId,
        });
        return res.status(200).json(review);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Failed to create review" });
    }
};

export const reviewUpdate = async (req, res) => {
    const { star, title, content, cafe_id, user_id } = req.body;

    try {
        const review = await reviewModel.updateReview(req.params.reviewId, {
            star,
            title,
            content,
            cafe_id,
            user_id,
        });
        return res.status(200).json(review);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Failed to update review" });
    }
};

export const reviewDelete = async (req, res) => {
    try {
        const review = await reviewModel.deleteReview(req.params.reviewId);
        return res.status(200).json(review);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Failed to delete review" });
    }
};

export const reviewDetails = async (req, res) => {
    const reviewId = req.params.reviewId;
    try {
        const review = await reviewModel.getReviewById(reviewId);
        return res.status(200).json(review);
    } catch (err) {
        console.log(err);
        throw new Error(err);
    }
};

export const reviewListByCafeId = async (req, res, next) => {
    try {
        const page = parseInt(req.pagination.page);
        const offset = parseInt(req.pagination.offset);
        const cafeId = parseInt(req.query.cafeId);

        if (isNaN(cafeId)) {
            return res.status(400).json({ message: "Invalid cafeId" });
        }

        const reviewQuery = `
            SELECT review.*, user.picture, user.name,
                   TO_CHAR(review.created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_created_at
            FROM review
            JOIN "user" ON review.user_id = "user".id
            WHERE review.cafe_id = $1
            LIMIT $2 OFFSET $3;
        `;

        const { rows: reviews } = await connection.query(reviewQuery, [cafeId, PAGE_SIZE, offset]);

        const countQuery = 'SELECT COUNT(*) AS total FROM review WHERE cafe_id = $1';
        const { rows: totalResults } = await connection.query(countQuery, [cafeId]);
        const total = parseInt(totalResults[0].total);
        const totalPages = Math.ceil(total / PAGE_SIZE);
        const totalCount = reviews.length;
        const avgStar = reviews.reduce((acc, review) => acc + review.star, 0) / (reviews.length || 1);
        const roundedAvgStar = Math.round(avgStar * 10) / 10;

        let response = {
            reviews,
            average: roundedAvgStar,
            total_count: totalCount,
            total_pages: totalPages,
            current_page: page,
            next_paging: reviews.length === PAGE_SIZE && page < totalPages ? page + 1 : null,
        };

        return res.status(200).json(response);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Failed to get reviews" });
    }
};

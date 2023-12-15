import {connection} from "../utils/db.js";

const executeQuery = async (query, params) => {
    try {
        console.log("Executing query: ", query, params);
        const [results] = await connection.query(query, params);
        console.log("Query results: ", results);
        return results;
    } catch (err) {
        console.error("Query error: ", err);
        throw err;
    }
}

class reviewModel {
    async getReviewIdByCafeId(cafeId) {
        console.log("Get review id by cafe id: ", cafeId);
        try {
            const query = "SELECT `id` FROM `review` WHERE `cafe_id` = ?";
            const results = await executeQuery(query, [cafeId]);
            return results.length > 0 ? results[0].id : null;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async getReviewById(reviewId) {
        console.log("Get review by id: ", reviewId);
        try {
            const query = "SELECT * FROM `review` WHERE `id` = ?";
            const results = await executeQuery(query, [reviewId]);
            return results.length > 0 ? results[0] : null;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async createReview({star, content, cafe_id, user_id}) {
        console.log("Create review: ", star, content, cafe_id, user_id);

        try {
            const insertReviewQuery = "INSERT INTO `review` (`star`, `content`, `cafe_id`, `user_id`) VALUES (?, ?, ?, ?);";
            const review = await executeQuery(insertReviewQuery, [star, content, cafe_id, user_id]);
            // await executeQuery(insertReviewPhotoQuery, [review.insertId, photo_url]);
            return review;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async updateReview(reviewId, {star, title, content, cafe_id, user_id}) {
        console.log("Update review: ", star, title, content, cafe_id, user_id);
        try {
            const updateReviewQuery = "UPDATE `review` SET `star` = ?, `title` = ?, `content` = ? WHERE `id` = ?;";
            return await executeQuery(updateReviewQuery, [star, title, content, reviewId]);
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async deleteReview(reviewId) {
        console.log("Delete review: ", reviewId);
        try {
            const deleteReviewQuery = "UPDATE `review` SET `deleted_at` = NOW() WHERE `id` = ?;";
            return await executeQuery(deleteReviewQuery, [reviewId]);
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }



}

export default new reviewModel();
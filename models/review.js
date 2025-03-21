import { connection } from "../utils/db.js";

const executeQuery = async (query, params) => {
    try {
        console.log("Executing query: ", query, params);
        const { rows } = await connection.query(query, params);
        console.log("Query results: ", rows);
        return rows;
    } catch (err) {
        console.error("Query error: ", err);
        throw err;
    }
};

class reviewModel {
    async getReviewIdByCafeId(cafeId) {
        console.log("Get review id by cafe id: ", cafeId);
        try {
            const query = "SELECT id FROM review WHERE cafe_id = $1";
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
            const query = "SELECT * FROM review WHERE id = $1";
            const results = await executeQuery(query, [reviewId]);
            return results.length > 0 ? results[0] : null;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async createReview({ star, content, cafe_id, user_id }) {
        console.log("Create review: ", star, content, cafe_id, user_id);
        try {
            const insertQuery = `
                INSERT INTO review (star, content, cafe_id, user_id)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const result = await executeQuery(insertQuery, [star, content, cafe_id, user_id]);
            return result[0]; // return newly created row
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async updateReview(reviewId, { star, title, content }) {
        console.log("Update review: ", star, title, content);
        try {
            const updateQuery = `
                UPDATE review
                SET star = $1, title = $2, content = $3
                WHERE id = $4
                RETURNING *
            `;
            const result = await executeQuery(updateQuery, [star, title, content, reviewId]);
            return result[0];
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async deleteReview(reviewId) {
        console.log("Delete review: ", reviewId);
        try {
            const deleteQuery = `
                UPDATE review
                SET deleted_at = NOW()
                WHERE id = $1
                RETURNING *
            `;
            const result = await executeQuery(deleteQuery, [reviewId]);
            return result[0];
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }
}

export default new reviewModel();

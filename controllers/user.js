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

class userModel {
    async checkUserExists(email) {
        console.log("Check user exist: ", email);
        try {
            const query = 'SELECT * FROM "user" WHERE email = $1';
            const results = await executeQuery(query, [email]);
            return results.length > 0;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async createUser({ provider, name, email, picture, hashedPassword, role }) {
        console.log("Create user: ", provider, name, email, picture, hashedPassword, role);
        try {
            const insertUserQuery = `
                INSERT INTO "user" (provider, name, email, picture, password, role)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `;
            const result = await executeQuery(insertUserQuery, [provider, name, email, picture, hashedPassword, role]);
            return result[0].id;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async getUserByEmail(email) {
        console.log("Get user by email: ", email);
        try {
            const query = 'SELECT * FROM "user" WHERE email = $1';
            const results = await executeQuery(query, [email]);
            return results.length > 0 ? results[0] : null;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async getUserFavoriteCafes(userId) {
        console.log("Get user favorite cafes: ", userId);
        try {
            const query = `
                SELECT cafe.*, to_char(user_favorite_cafe.created_at, 'YYYY-MM-DD HH24:MI:SS') AS formatted_created_at
                FROM cafe
                INNER JOIN user_favorite_cafe ON cafe.id = user_favorite_cafe.cafe_id
                WHERE user_favorite_cafe.user_id = $1
            `;
            return await executeQuery(query, [userId]);
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }
}

export default new userModel();

import { connection } from "../utils/db.js";

const executeQuery = async (query, params) => {
    try {
        console.log("Executing query: ", query, params);
        const result = await connection.query(query, params);
        console.log("Query results: ", result.rows);
        return result.rows;
    } catch (err) {
        console.error("Query error: ", err);
        throw err;
    }
};

class cafeModel {
    async checkAreaExists(city, district) {
        const query = "SELECT * FROM area WHERE city = $1 AND district = $2";
        const results = await executeQuery(query, [city, district]);
        return results.length > 0;
    }

    async checkTagExists(tag) {
        const query = "SELECT * FROM cafe_tag WHERE name = $1";
        const results = await executeQuery(query, [tag]);
        return results.length > 0;
    }

    async getTagIdByName(tag) {
        const query = "SELECT id FROM cafe_tag WHERE name = $1";
        const results = await executeQuery(query, [tag]);
        return results.length > 0 ? results[0].id : null;
    }

    async getAreaIdByCityDistrict(city, district) {
        const query = "SELECT id FROM area WHERE city = $1 AND district = $2";
        const results = await executeQuery(query, [city, district]);
        return results.length > 0 ? results[0].id : null;
    }

    async createCafe({ name, city, address, lat, lng, main_image, opening_hours, phone, description, place_id, tags }) {
        const insertCafeQuery = `
            INSERT INTO cafe (name, city, phone, address, lat, lng, main_image, opening_hours, description, place_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id;
        `;
        const results = await executeQuery(insertCafeQuery, [name, city, phone, address, lat, lng, main_image, opening_hours, description, place_id]);
        const cafeId = results[0].id;

        for (const tag of tags) {
            if (!(await this.checkTagExists(tag))) {
                const insertCafeTagQuery = "INSERT INTO cafe_tag (name) VALUES ($1)";
                await executeQuery(insertCafeTagQuery, [tag]);
            }

            const tagId = await this.getTagIdByName(tag);
            const insertCafeTagsQuery = "INSERT INTO cafe_tags (cafe_id, tag_id) VALUES ($1, $2)";
            await executeQuery(insertCafeTagsQuery, [cafeId, tagId]);
        }

        return { id: cafeId };
    }

    async updateCafe(cafeId, { name, city, district, email, phone, instagram, facebook, description, tags }) {
        let areaId;
        if (!(await this.checkAreaExists(city, district))) {
            const insertAreaQuery = "INSERT INTO area (city, district) VALUES ($1, $2) RETURNING id";
            const result = await executeQuery(insertAreaQuery, [city, district]);
            areaId = result[0].id;
        } else {
            areaId = await this.getAreaIdByCityDistrict(city, district);
        }

        const updateCafeAreaQuery = "UPDATE cafe SET area_id = $1 WHERE id = $2";
        await executeQuery(updateCafeAreaQuery, [areaId, cafeId]);

        const updateCafeQuery = `
            UPDATE cafe SET name = $1, description = $2, email = $3, phone = $4, instagram = $5, facebook = $6
            WHERE id = $7
        `;
        await executeQuery(updateCafeQuery, [name, description, email, phone, instagram, facebook, cafeId]);

        const deleteCafeTagsQuery = "DELETE FROM cafe_tags WHERE cafe_id = $1";
        await executeQuery(deleteCafeTagsQuery, [cafeId]);

        for (const tag of Object.keys(tags)) {
            if (!(await this.checkTagExists(tag))) {
                const insertCafeTagQuery = "INSERT INTO cafe_tag (name) VALUES ($1)";
                await executeQuery(insertCafeTagQuery, [tag]);
            }
            const tagId = await this.getTagIdByName(tag);
            const insertCafeTagsQuery = "INSERT INTO cafe_tags (cafe_id, tag_id) VALUES ($1, $2)";
            await executeQuery(insertCafeTagsQuery, [cafeId, tagId]);
        }

        return { id: cafeId };
    }

    async deleteCafe(cafeId) {
        const deleteCafeTagsQuery = "UPDATE cafe_tags SET deleted_at = NOW() WHERE cafe_id = $1";
        await executeQuery(deleteCafeTagsQuery, [cafeId]);

        const deleteCafeQuery = "UPDATE cafe SET deleted_at = NOW() WHERE id = $1";
        return await executeQuery(deleteCafeQuery, [cafeId]);
    }
}

export default new cafeModel();

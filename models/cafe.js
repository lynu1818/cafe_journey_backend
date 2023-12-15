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

class cafeModel {
    async checkAreaExists(city, district) {
        console.log("Check area exist: ", city, district);
        try {
            const query = "SELECT * FROM `area` WHERE `city` = ? AND `district` = ?";
            const results = await executeQuery(query, [city, district]);
            return results.length > 0;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async checkTagExists(tag) {
        console.log("Check tag exist: ", tag);
        try {
            const query = "SELECT * FROM `cafe_tag` WHERE `name` = ?";
            const results = await executeQuery(query, [tag]);
            return results.length > 0;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async getTagIdByName(tag) {
        console.log("Get tag id by name: ", tag);
        try {
            const query = "SELECT `id` FROM `cafe_tag` WHERE `name` = ?";
            const results = await executeQuery(query, [tag]);
            return results.length > 0 ? results[0].id : null;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async getAreaIdByCityDistrict(city, district) {
        console.log("Get area id by city and district: ", city, district);
        try {
            const query = "SELECT `id` FROM `area` WHERE `city` = ? AND `district` = ?";
            const results = await executeQuery(query, [city, district]);
            return results.length > 0 ? results[0].id : null;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async createCafe({name, city, address, lat, lng, main_image, opening_hours, phone, description, place_id, tags}) {
        console.log("Create cafe: ", name, city, address, lat, lng, main_image, opening_hours, phone, description, place_id, tags);

        try {

            const insertCafeQuery = "INSERT INTO `cafe` (`name`, `city`, `phone`, `address`, `lat`, `lng`, `main_image`, `opening_hours`, `description`, `place_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
            const cafe = await executeQuery(insertCafeQuery, [name, city, phone, address, lat, lng, main_image, opening_hours, description, place_id]);
            const cafeId = cafe.insertId;

            console.log("!!!!!!!!!!!!!!!!!!!!!!tags", tags);
            for (const tag of tags) {
                if (!(await this.checkTagExists(tag))) { // if tag not exists, insert tag
                    const insertCafeTagQuery = "INSERT INTO `cafe_tag` (`name`) VALUES (?)";
                    await executeQuery(insertCafeTagQuery, [tag]);
                }

                const tagId = await this.getTagIdByName(tag);
                const insertCafeTagsQuery = "INSERT INTO `cafe_tags` (`cafe_id`, `tag_id`) VALUES (?, ?)";
                await executeQuery(insertCafeTagsQuery, [cafeId, tagId]);

            }

            return cafe;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async updateCafe(cafeId, {name, city, district, email, phone, instagram, facebook, description, tags}) {
        console.log("Update cafe: ", cafeId, name, city, district, email, phone, instagram, facebook, description, tags);

        try {
            if (!(await this.checkAreaExists(city, district))) { //if area not exists, insert area
                const insertAreaQuery = "INSERT INTO `area` (`city`, `district`) VALUES (?, ?)";
                const area = await executeQuery(insertAreaQuery, [city, district]);
                const areaId = area.insertId;
                const updateCafeAreaQuery = "UPDATE `cafe` SET `area_id` = ? WHERE `id` = ?";
                await executeQuery(updateCafeAreaQuery, [areaId, cafeId]);
            } else {
                const areaId = await this.getAreaIdByCityDistrict(city, district);
                const updateCafeAreaQuery = "UPDATE `cafe` SET `area_id` = ? WHERE `id` = ?";
                await executeQuery(updateCafeAreaQuery, [areaId, cafeId]);
            }

            const updateCafeQuery = "UPDATE `cafe` SET `name` = ?, `description` = ?, `email` = ?, `phone` = ?, `instagram` = ?, `facebook` = ? WHERE `id` = ?;";
            const cafe = await executeQuery(updateCafeQuery, [name, description, email, phone, instagram, facebook, cafeId]);

            const deleteCafeTagsQuery = "DELETE FROM `cafe_tags` WHERE `cafe_id` = ?";
            await executeQuery(deleteCafeTagsQuery, [cafeId]);

            const tagKeys = Object.keys(tags);
            for (const tag of tagKeys) {
                if (!(await this.checkTagExists(tag))) { // if tag not exists, insert tag
                    const insertCafeTagQuery = "INSERT INTO `cafe_tag` (`name`) VALUES (?)";
                    await executeQuery(insertCafeTagQuery, [tag]);
                }

                const tagId = await this.getTagIdByName(tag);
                const insertCafeTagsQuery = "INSERT INTO `cafe_tags` (`cafe_id`, `tag_id`) VALUES (?, ?)";
                await executeQuery(insertCafeTagsQuery, [cafeId, tagId]);

            }

            return cafe;
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }

    async deleteCafe(cafeId) {
        console.log("Delete cafe: ", cafeId);
        try {
            const deleteCafeTagsQuery = "UPDATE `cafe_tags` SET `deleted_at` = NOW() WHERE `cafe_id` = ?;";
            await executeQuery(deleteCafeTagsQuery, [cafeId]);



            const deleteCafeQuery = "UPDATE `cafe` SET `deleted_at` = NOW() WHERE `id` = ?;";
            return await executeQuery(deleteCafeQuery, [cafeId]);
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    }



}

export default new cafeModel();
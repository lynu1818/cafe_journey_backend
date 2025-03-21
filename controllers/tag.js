import {connection} from "../utils/db.js";

export const tagList = async (req, res) => {
    try {
        const query = "SELECT * FROM `cafe_tag`";
        const [results] = await connection.query(query);
        return res.status(200).json(results);
    } catch (err) {
        console.log(err);
        return res.status(500).json({error: "Failed to get tag list"});
    }
}
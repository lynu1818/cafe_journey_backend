import express from "express";
const router = express.Router();

import { tagList } from "../controllers/tag.js";


// router.get('/detail/:cafeId', cafeDetails);
// router.post('/create', cafeCreate);
router.get('/list', tagList);
// router.put('/update/:cafeId', cafeUpdate);
// router.delete('/delete/:cafeId', cafeDelete);


router.use('/api/1.0/tag', router);
export default router;
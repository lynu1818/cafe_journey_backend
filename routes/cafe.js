import express from "express";
const router = express.Router();

import { paginationMiddleware, cafeAddToFavorite, cafeDetails, cafeCreate, cafeList, cafeUpdate, cafeDelete } from "../controllers/cafe.js";


router.post('/addfav', cafeAddToFavorite);
router.get('/detail/:cafeId', cafeDetails);
router.post('/create', cafeCreate);
router.get('/list', paginationMiddleware, cafeList);
router.put('/update/:cafeId', cafeUpdate);
router.delete('/delete/:cafeId', cafeDelete);


router.use('/api/1.0/cafe', router);
export default router;
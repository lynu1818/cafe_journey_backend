import express from "express";
const router = express.Router();

import { reviewListByCafeId, reviewDetails, reviewCreate, reviewUpdate, reviewDelete } from "../controllers/review.js";
import {paginationMiddleware} from "../controllers/cafe.js";


router.get('/detail/:reviewId', reviewDetails);
router.post('/create', reviewCreate);
router.get('/list', paginationMiddleware, reviewListByCafeId);
router.put('/update/:reviewId', reviewUpdate);
router.delete('/delete/:reviewId', reviewDelete);


router.use('/api/1.0/review', router);
export default router;
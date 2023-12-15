import express from "express";
const router = express.Router();

import {uploadUserPicture, userSignUp, userLogIn, userLogOut, getUserFavoriteCafes} from "../controllers/user.js";
import {auth} from "../middlewares/auth.js";
// import {userProfile} from "../controllers/user/userProfileController.js";


router.post('/signup', uploadUserPicture, userSignUp);
router.post('/login', userLogIn);
router.get('/logout', userLogOut);
router.get('/favorite', getUserFavoriteCafes);
// router.get('/profile', userProfile);


router.use('/api/1.0/user', router);

export default router;
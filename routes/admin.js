import express from 'express';
import multer from 'multer';
import { authenticatedAdmin } from '../middlewares/auth.js';
import * as adminController from '../controllers/admin.js';

const router = express.Router();
const upload = multer({ dest: 'temp/' });

// login/logout
router.get('/login', adminController.loginPage);
router.post('/login', adminController.login);
router.get('/logout', adminController.logout);

// products
router.get('/products', authenticatedAdmin, adminController.getProducts);
router.post('/products', authenticatedAdmin, upload.single('image'), adminController.postProduct);
router.get('/products/:id', authenticatedAdmin, adminController.editProduct);
router.put('/products/:id', authenticatedAdmin, upload.single('image'), adminController.putProduct);
router.delete('/products/:id', authenticatedAdmin, adminController.deleteProduct);

// orders
router.get('/orders', authenticatedAdmin, adminController.getOrders);
router.get('/orders/:id', authenticatedAdmin, adminController.getOrder);
router.post('/orders/:id/ship', authenticatedAdmin, adminController.shipOrder);
router.post('/orders/:id/cancel', authenticatedAdmin, adminController.cancelOrder);
router.post('/orders/:id/recover', authenticatedAdmin, adminController.recoverOrder);

// authority
router.get('/authority', authenticatedAdmin, adminController.getUsers);
router.post('/authority/:id', authenticatedAdmin, adminController.changeAuth);

export default router;

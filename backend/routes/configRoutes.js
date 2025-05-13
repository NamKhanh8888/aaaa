import express from 'express';
const router = express.Router();
import { getPaypalClientId } from '../controllers/configController.js';

router.route('/paypal').get(getPaypalClientId);

export default router; 
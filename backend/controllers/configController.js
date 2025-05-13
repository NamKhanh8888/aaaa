import asyncHandler from '../middleware/asyncHandler.js';

// @desc    Get PayPal client ID
// @route   GET /api/config/paypal
// @access  Public
const getPaypalClientId = asyncHandler(async (req, res) => {
  res.json({ clientId: process.env.PAYPAL_CLIENT_ID });
});

export { getPaypalClientId }; 
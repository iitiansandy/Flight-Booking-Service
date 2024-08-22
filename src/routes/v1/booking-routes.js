const express = require('express');
const router = express.Router();

const { BookingController } = require('../../controllers');

// CREATE BOOKING
router.post('/', BookingController.createBooking);

// MAKE PAYMENT
router.post('/payments', BookingController.makePayment);


module.exports = router;
const express = require('express');
const router = express.Router();

const { BookingController } = require('../../controllers');

// CREATE BOOKING
router.post('/', BookingController.createBooking);


module.exports = router;
const express = require('express');
const Route = express.Router();
const user = require('../controllers/user');

// BOOKING
Route.post('/store-booking', user.storeBooking);

module.exports = Route;

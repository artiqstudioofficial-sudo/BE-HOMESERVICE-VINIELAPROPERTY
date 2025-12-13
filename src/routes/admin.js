const express = require('express');
const Route = express.Router();
const admin = require('../controllers/admin');

// USER MANAGEMENT
Route.post('/user-management-store', admin.userManagementStore);
Route.put('/user-management-update', admin.userManagementUpdate);
Route.delete('/user-management-delete', admin.userManagementDelete);
Route.get('/user-management-list', admin.userManagementList);

// USER ROLE
Route.get('/user-role-list', admin.userRoleList);

// TECH SCHEDULE
Route.get('/tech-schedule', admin.techSchedule);

// SERVICE
Route.get('/service-list', admin.serviceList);
Route.get('/service-category-list', admin.serviceCategoryList);
Route.post('/service-store', admin.serviceStore);
Route.put('/service-update', admin.serviceUpdate);
Route.delete('/service-delete', admin.serviceDelete);

// BOOKING
Route.get('/user-booking-list', admin.userBookingList);
Route.post('/store-booking', admin.storeBooking);
Route.put('/update-booking-status', admin.updateBookingStatus);

module.exports = Route;

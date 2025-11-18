const express = require('express');
const Route = express.Router();
const admin = require('../controllers/admin');

Route.post('/user-management-store', admin.userManagementStore);
Route.put('/user-management-update', admin.userManagementUpdate);
Route.get('/user-management-list', admin.userManagementList);
Route.get('/user-booking-list', admin.userBookingList);
Route.get('/user-role-list', admin.userRoleList);
Route.get('/service-list', admin.serviceList);
Route.post('/service-store', admin.serviceStore);
Route.put('/service-update', admin.serviceUpdate);
Route.put('/update-booking-status', admin.updateBookingStatus);
Route.get('/tech-schedule', admin.techSchedule);

module.exports = Route;

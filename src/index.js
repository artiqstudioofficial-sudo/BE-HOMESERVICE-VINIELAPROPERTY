const express = require('express');

const applicant = require('./routes/applicant');
const jobVacancy = require('./routes/job_vacancy');
const message = require('./routes/message');
const admin = require('./routes/admin');
const user = require('./routes/user');

const Route = express.Router();

Route.use('/api/v1/admin', admin)
  .use('/api/v1/user', user)
  .use('/api/v1/applicant', applicant)
  .use('/api/v1/job-vacancy', jobVacancy)
  .use('/api/v1/message', message);

module.exports = Route;

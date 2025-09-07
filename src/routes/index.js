// src/routes/index.js
const { Router } = require("express");
const adminRoutes = require("./adminRoutes");
const publicRoutes = require("./publicRoutes");

const routes = Router();

routes.use(adminRoutes);
routes.use(publicRoutes);

module.exports = routes;

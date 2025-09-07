// src/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const routes = require("./routes");

class App {
  constructor() {
    this.server = express();
    this.middlewares();
    this.routes();
    this.exceptionHandler();
  }

  middlewares() {
    this.server.use(cors());
    this.server.use(express.json());
    // Serve os arquivos estáticos da pasta 'public'
    this.server.use(express.static(path.resolve(__dirname, "..", "public")));
  }

  routes() {
    // Todas as rotas da API começarão com /api
    this.server.use("/api", routes);
  }

  exceptionHandler() {
    this.server.use((err, req, res, next) => {
      console.error(err);
      return res.status(500).json({ error: "Erro interno do servidor." });
    });
  }
}

module.exports = new App().server;

// src/routes/publicRoutes.js
const { Router } = require("express");
const ServicoController = require("../controllers/servicoController");
const AgendamentoController = require("../controllers/agendamentoController");

const routes = Router();

routes.get("/servicos", ServicoController.listarAtivos);
routes.post("/agendamentos", AgendamentoController.criar);
// Adicionar rota para buscar horários ocupados aqui

module.exports = routes;

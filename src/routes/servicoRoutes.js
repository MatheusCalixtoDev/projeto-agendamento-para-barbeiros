const { Router } = require("express");
const ServicoController = require("../controllers/servicoController");

const routes = Router();

// Rota pública que o cliente usa na página de agendamento
routes.get("/servicos", ServicoController.listarAtivos);

module.exports = routes;

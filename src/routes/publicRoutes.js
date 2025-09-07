const { Router } = require("express");
const ServicoController = require("../controllers/servicoController");
const AgendamentoController = require("../controllers/agendamentoController");

const routes = Router();

routes.get("/servicos", ServicoController.listarAtivos);
routes.post("/agendamentos", AgendamentoController.criar);
routes.get("/agendamentos/data/:date", AgendamentoController.horariosOcupados);

module.exports = routes;

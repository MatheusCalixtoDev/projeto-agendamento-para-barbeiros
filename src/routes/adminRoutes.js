// src/routes/adminRoutes.js
const { Router } = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const AuthController = require("../controllers/authController");
const ServicoController = require("../controllers/servicoController");
const AgendamentoController = require("../controllers/agendamentoController");
const EstatisticasController = require("../controllers/estatisticasController");

const routes = Router();

// Rota de Login não protegida
routes.post("/admin/login", AuthController.login);

// A partir daqui, todas as rotas precisam de token
routes.use(authMiddleware);

// Serviços (Admin)
routes.get("/admin/servicos", ServicoController.listarTodos);
routes.post("/admin/servicos", ServicoController.criar);
routes.put("/admin/servicos/:id", ServicoController.atualizar);

// Agendamentos (Admin)
routes.get("/admin/agendamentos", AgendamentoController.listar);
routes.put(
  "/admin/agendamentos/:id/status",
  AgendamentoController.atualizarStatus
);
routes.delete("/admin/agendamentos/:id", AgendamentoController.deletar);

// Estatísticas (Admin)
routes.get("/admin/estatisticas", EstatisticasController.getStats);

module.exports = routes;

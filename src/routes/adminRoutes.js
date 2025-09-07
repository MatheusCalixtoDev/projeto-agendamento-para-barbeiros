// src/routes/adminRoutes.js
const { Router } = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const AuthController = require("../controllers/authController");
const ServicoController = require("../controllers/servicoController");
// Importe outros controllers de admin aqui

const routes = Router();

// Rota de Login não é protegida
routes.post("/admin/login", AuthController.login);

// A partir daqui, todas as rotas precisam de token
routes.use(authMiddleware);

// Serviços (Admin)
routes.get("/admin/servicos", ServicoController.listarTodos);
routes.post("/admin/servicos", ServicoController.criar);
routes.put("/admin/servicos/:id", ServicoController.atualizar);

// Adicionar rotas para agendamentos e estatísticas aqui

module.exports = routes;

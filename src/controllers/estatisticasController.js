// src/controllers/estatisticasController.js
const prisma = require("../config/prisma");

class EstatisticasController {
  async getStats(req, res) {
    // Lógica para buscar as estatísticas usando Prisma
    // Ex: const agendamentosHoje = await prisma.agendamento.count(...)
    // Este é um exemplo mais complexo, pode ser implementado depois.
    return res.json({ message: "Estatísticas em breve!" });
  }
}

module.exports = new EstatisticasController();

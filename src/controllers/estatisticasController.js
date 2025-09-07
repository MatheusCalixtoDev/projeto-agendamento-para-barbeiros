// src/controllers/estatisticasController.js
const prisma = require("../config/prisma");

class EstatisticasController {
  async getStats(req, res) {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(hoje.getDate() + 1);

      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      fimMes.setHours(23, 59, 59, 999);

      const agendamentosHoje = await prisma.agendamento.count({
        where: {
          dataAgendamento: { gte: hoje, lt: amanha },
          status: { not: "cancelado" },
        },
      });

      const receitaHojeAggr = await prisma.agendamento.aggregate({
        _sum: { servico: { select: { preco: true } } },
        where: {
          dataAgendamento: { gte: hoje, lt: amanha },
          status: { not: "cancelado" },
        },
      });
      const receitaHoje = receitaHojeAggr._sum.servico?.preco || 0;

      const agendamentosMes = await prisma.agendamento.count({
        where: {
          dataAgendamento: { gte: inicioMes, lte: fimMes },
          status: { not: "cancelado" },
        },
      });

      const receitaMesAggr = await prisma.agendamento.aggregate({
        _sum: { servico: { select: { preco: true } } },
        where: {
          dataAgendamento: { gte: inicioMes, lte: fimMes },
          status: { not: "cancelado" },
        },
      });
      const receitaMes = receitaMesAggr._sum.servico?.preco || 0;

      const totalAgendamentos = await prisma.agendamento.count({
        where: { status: { not: "cancelado" } },
      });

      const servicoPopular = await prisma.agendamento.groupBy({
        by: ["servicoId"],
        _count: { servicoId: true },
        where: { status: { not: "cancelado" } },
        orderBy: { _count: { servicoId: "desc" } },
        take: 1,
      });

      let servicoPopularNome = "Nenhum";
      if (servicoPopular.length > 0) {
        const servico = await prisma.servico.findUnique({
          where: { id: servicoPopular[0].servicoId },
        });
        servicoPopularNome = servico.nome;
      }

      return res.json({
        agendamentosHoje,
        receitaHoje,
        agendamentosMes,
        receitaMes,
        totalAgendamentos,
        servicoPopular: { nome: servicoPopularNome },
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
      return res.status(500).json({ error: "Erro ao carregar estatísticas" });
    }
  }
}

module.exports = new EstatisticasController();

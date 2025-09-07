// src/controllers/agendamentoController.js
const prisma = require("../config/prisma");

class AgendamentoController {
  // Rota Pública
  async criar(req, res) {
    const {
      cliente_nome,
      cliente_telefone,
      data_agendamento,
      hora_agendamento,
      servico_id,
    } = req.body;

    try {
      const dataHora = new Date(
        `${data_agendamento}T${hora_agendamento}:00.000Z`
      );

      const agendamentoExistente = await prisma.agendamento.findFirst({
        where: { dataAgendamento: dataHora, status: { not: "cancelado" } },
      });

      if (agendamentoExistente) {
        return res.status(409).json({ error: "Horário já ocupado!" });
      }

      const agendamento = await prisma.agendamento.create({
        data: {
          clienteNome: cliente_nome,
          clienteTelefone: cliente_telefone,
          dataAgendamento: dataHora,
          status: "confirmado",
          servico: { connect: { id: servico_id } },
        },
        include: { servico: true },
      });
      return res
        .status(201)
        .json({ message: "Agendamento confirmado!", agendamento });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "Não foi possível criar o agendamento." });
    }
  }

  // Rotas de Admin
  async listar(req, res) {
    const { page = 1, limit = 10, data, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (data) {
      where.dataAgendamento = {
        gte: new Date(`${data}T00:00:00.000Z`),
        lt: new Date(`${data}T23:59:59.999Z`),
      };
    }
    if (status) {
      where.status = status;
    }

    try {
      const agendamentos = await prisma.agendamento.findMany({
        where,
        include: {
          servico: {
            select: {
              nome: true,
              preco: true,
            },
          },
        },
        orderBy: [{ dataAgendamento: "desc" }],
        skip: offset,
        take: parseInt(limit),
      });

      const total = await prisma.agendamento.count({ where });

      const agendamentosFormatados = agendamentos.map((ag) => ({
        id: ag.id,
        cliente_nome: ag.clienteNome,
        cliente_telefone: ag.clienteTelefone,
        servico_nome: ag.servico.nome,
        servico_preco: ag.servico.preco,
        data_agendamento: ag.dataAgendamento.toISOString().split("T")[0],
        hora_agendamento: ag.dataAgendamento.toISOString().substr(11, 5),
        status: ag.status,
      }));

      return res.json({
        agendamentos: agendamentosFormatados,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao listar agendamentos." });
    }
  }

  async atualizarStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    if (!["confirmado", "cancelado", "concluido"].includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    try {
      await prisma.agendamento.update({
        where: { id },
        data: { status },
      });
      return res.json({ message: "Status atualizado com sucesso" });
    } catch (error) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }
  }

  async deletar(req, res) {
    const { id } = req.params;
    try {
      await prisma.agendamento.delete({ where: { id } });
      return res.json({ message: "Agendamento deletado com sucesso" });
    } catch (error) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }
  }

  async horariosOcupados(req, res) {
    const { date } = req.params; // Formato YYYY-MM-DD
    try {
      const inicioDia = new Date(`${date}T00:00:00.000Z`);
      const fimDia = new Date(`${date}T23:59:59.999Z`);

      const agendamentos = await prisma.agendamento.findMany({
        where: {
          dataAgendamento: {
            gte: inicioDia,
            lte: fimDia,
          },
          status: {
            not: "cancelado",
          },
        },
        select: {
          dataAgendamento: true,
        },
      });

      const horariosOcupados = agendamentos.map((ag) =>
        ag.dataAgendamento.toISOString().substr(11, 5)
      );

      return res.json({ horariosOcupados });
    } catch (error) {
      console.error("Erro ao buscar horários:", error);
      return res
        .status(500)
        .json({ error: "Erro ao buscar horários ocupados" });
    }
  }
}

module.exports = new AgendamentoController();

// src/controllers/agendamentoController.js
const prisma = require("../config/prisma");

class AgendamentoController {
  async criar(req, res) {
    const {
      cliente_nome,
      cliente_telefone,
      data_agendamento,
      hora_agendamento,
      servico_id,
    } = req.body;

    // Combina data e hora para o formato DateTime do Prisma
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
    return res.status(201).json(agendamento);
  }

  // ... (Adicionar métodos para listar, atualizar status, deletar para o admin)
}

module.exports = new AgendamentoController();

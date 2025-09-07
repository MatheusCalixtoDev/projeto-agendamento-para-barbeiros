// src/controllers/servicoController.js
const prisma = require("../config/prisma");

class ServicoController {
  async listarTodos(req, res) {
    // Admin
    const servicos = await prisma.servico.findMany({
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    });
    return res.json({ servicos });
  }

  async listarAtivos(req, res) {
    // Cliente
    const servicos = await prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { preco: "asc" },
    });
    return res.json({ servicos });
  }

  async criar(req, res) {
    const { nome, descricao, preco, duracao, ativo } = req.body;
    if (!nome || !preco) {
      return res.status(400).json({ error: "Nome e preço são obrigatórios" });
    }
    try {
      const servico = await prisma.servico.create({
        data: {
          nome,
          descricao,
          preco: parseFloat(preco),
          duracao: parseInt(duracao) || 30,
          ativo: ativo !== undefined ? ativo : true,
        },
      });
      return res.status(201).json({ servico });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Não foi possível criar o serviço." });
    }
  }

  async atualizar(req, res) {
    const { id } = req.params;
    const { nome, descricao, preco, duracao, ativo } = req.body;

    try {
      const servico = await prisma.servico.update({
        where: { id },
        data: {
          nome,
          descricao,
          preco: parseFloat(preco),
          duracao: parseInt(duracao),
          ativo,
        },
      });
      return res.json(servico);
    } catch (error) {
      return res.status(404).json({ error: "Serviço não encontrado." });
    }
  }
}

module.exports = new ServicoController();

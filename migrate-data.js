// migrate-data.js

const sqlite3 = require("sqlite3").verbose();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const db = new sqlite3.Database("./barbershop.db");

async function main() {
  console.log("Iniciando migração de dados do SQLite para o PostgreSQL...");

  try {
    // 1. Migrar Admins
    console.log("Migrando admins...");
    const admins = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM admins", (err, rows) =>
        err ? reject(err) : resolve(rows)
      );
    });

    await prisma.admin.createMany({
      data: admins.map((admin) => ({
        username: admin.username,
        passwordHash: admin.password_hash, // Mapeando de password_hash
        createdAt: new Date(admin.created_at),
      })),
      skipDuplicates: true,
    });
    console.log(`✅ ${admins.length} admins migrados com sucesso.`);

    // 2. Migrar Serviços
    console.log("Migrando serviços...");
    const servicos = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM servicos", (err, rows) =>
        err ? reject(err) : resolve(rows)
      );
    });

    // Guardar os IDs antigos para mapear depois nos agendamentos
    const oldServicoIds = servicos.map((s) => s.id);

    await prisma.servico.createMany({
      data: servicos.map((servico) => ({
        nome: servico.nome,
        descricao: servico.descricao,
        preco: servico.preco,
        duracao: servico.duracao,
        ativo: Boolean(servico.ativo),
        createdAt: new Date(servico.created_at),
      })),
    });
    console.log(`✅ ${servicos.length} serviços migrados com sucesso.`);

    // 3. Mapear IDs antigos para os novos IDs (UUIDs) dos serviços
    const newServicos = await prisma.servico.findMany();
    const servicoIdMap = newServicos.reduce((map, newServico, index) => {
      // Assume que a ordem de inserção foi mantida
      const oldId = oldServicoIds[index];
      map[oldId] = newServico.id;
      return map;
    }, {});

    // 4. Migrar Agendamentos
    console.log("Migrando agendamentos...");
    const agendamentos = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM agendamentos", (err, rows) =>
        err ? reject(err) : resolve(rows)
      );
    });

    const agendamentosParaCriar = agendamentos
      .map((ag) => {
        // Combina data e hora do SQLite em um único objeto Date
        const dataHora = new Date(
          `${ag.data_agendamento}T${ag.hora_agendamento}`
        );

        return {
          clienteNome: ag.cliente_nome,
          clienteTelefone: ag.cliente_telefone,
          dataAgendamento: dataHora,
          status: ag.status,
          servicoId: servicoIdMap[ag.servico_id], // Usa o ID NOVO do serviço
          createdAt: new Date(ag.created_at),
          updatedAt: new Date(ag.updated_at),
        };
      })
      .filter((ag) => ag.servicoId); // Filtra agendamentos cujo serviço não foi encontrado

    if (agendamentosParaCriar.length > 0) {
      await prisma.agendamento.createMany({
        data: agendamentosParaCriar,
      });
    }

    console.log(
      `✅ ${agendamentosParaCriar.length} agendamentos migrados com sucesso.`
    );
  } catch (error) {
    console.error("Ocorreu um erro durante a migração:", error);
  } finally {
    db.close();
    await prisma.$disconnect();
    console.log("Migração finalizada.");
  }
}

main();

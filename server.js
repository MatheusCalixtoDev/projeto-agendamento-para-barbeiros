const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

console.log("🔍 PORT do .env:", process.env.PORT);
console.log(
  "🔍 JWT_SECRET do .env:",
  process.env.JWT_SECRET ? "✅ Definido" : "❌ Não encontrado"
);
console.log("🔍 Arquivo .env carregado!");

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => {
    console.error(
      "⚠️  JWT_SECRET não definido no .env! Usando chave temporária."
    );
    return "chave-temporaria-insegura-" + Date.now();
  })();

const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Configuração do banco SQLite
const dbPath = path.join(__dirname, "barbershop.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
      CREATE TABLE IF NOT EXISTS servicos( 
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT NOT NULL,
        preco REAL NOT NULL, 
        duracao INTEGER DEFAULT 30,
        ativo BOOLEAN DEFAULT 1, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
});
// Inicialização do banco de dados
db.serialize(() => {
  // Tabela de agendamento
  db.run(`
    CREATE TABLE IF NOT EXISTS agendamentos(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_nome TEXT NOT NULL,
      cliente_telefone TEXT NOT NULL,
      data_agendamento DATE NOT NULL,
      hora_agendamento TIME NOT NULL,
      servico_id INTEGER NOT NULL,
      status TEXT DEFAULT 'confirmado',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (servico_id) REFERENCES servicos(id)
    )
  `);

  // Tabela de admin
  db.run(`
    CREATE TABLE IF NOT EXISTS admins(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  //inserir serviços padrão(novo)
  db.run(`  INSERT OR IGNORE INTO servicos(id, nome, descricao, preco, duracao) VALUES
      (1, 'Corte Simples', 'Corte de cabelo simples', 30.00, 30), 
      (2, 'Corte + Barba', 'Corte de cabelo + barba', 40.00, 45), 
      (3, 'Corte Infantil', 'Corte de cabelo infantil', 20.00, 30), 
      (4, 'Barba', 'Barba', 20.00, 15), 
      (5, 'Sobrancelha', 'Sobrancelha', 15.00, 10), 
      (6, 'Corte Completo', 'Corte + barba + sobrancelha', 50.00, 60)
    `);

  // Criar admin padrão
  const defaultPasswordHash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
  db.run(`INSERT OR IGNORE INTO admins(username, password_hash) VALUES(?, ?)`, [
    DEFAULT_ADMIN_USERNAME,
    defaultPasswordHash,
  ]);
  console.log("Banco de dados inicializado com serviços padrão e admin.");
});

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token de acesso requerido" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" });
    }
    req.user = user;
    next();
  });
};

// ROTAS DA API

// Login do admin
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM admins WHERE username = ?",
    [username],
    (err, admin) => {
      if (err) {
        return res.status(500).json({ error: "Erro no servidor" });
      }
      if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const token = jwt.sign(
        { id: admin.id, username: admin.username },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({
        message: "Login realizado com sucesso",
        token,
        user: { id: admin.id, username: admin.username },
      });
    }
  );
});

// Buscar horários ocupados de uma data
app.get("/api/agendamentos/data/:date", (req, res) => {
  const { date } = req.params;

  db.all(
    "SELECT hora_agendamento FROM agendamentos WHERE data_agendamento = ? AND status != ?",
    [date, "cancelado"],
    (err, rows) => {
      if (err) {
        console.error("Erro ao buscar horários:", err);
        return res.status(500).json({ error: "Erro ao buscar horários" });
      }
      const horariosOcupados = rows.map((row) => row.hora_agendamento);
      res.json({ horariosOcupados });
    }
  );
});

// Criar novo agendamento
app.post("/api/agendamentos", (req, res) => {
  const {
    cliente_nome,
    cliente_telefone,
    data_agendamento,
    hora_agendamento,
    servico_id,
  } = req.body;

  if (
    !cliente_nome ||
    !cliente_telefone ||
    !data_agendamento ||
    !hora_agendamento ||
    !servico_id
  ) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }
  //verificar se o servico exite
  db.get(
    "SELECT * FROM servicos WHERE id = ? AND ativo = 1",
    [servico_id],
    (err, servico) => {
      if (err) {
        console.error("Erro ao buscar serviço:", err);
        return res.status(500).json({ error: "Erro ao buscar serviço" });
      }
      if (!servico) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }
    }
  );

  // Verificar se o horário já está ocupado
  db.get(
    "SELECT id FROM agendamentos WHERE data_agendamento = ? AND hora_agendamento = ? AND status != ?",
    [data_agendamento, hora_agendamento, "cancelado"],
    (err, existente) => {
      if (err) {
        console.error("Erro ao verificar disponibilidade:", err);
        return res
          .status(500)
          .json({ error: "Erro ao verificar disponibilidade" });
      }

      if (existente) {
        return res.status(409).json({ error: "Horário já ocupado!" });
      }

      // Criar agendamento
      db.run(
        `INSERT INTO agendamentos (cliente_nome, cliente_telefone, data_agendamento, hora_agendamento, servico_id) VALUES(?, ?, ?, ?, ?)`,
        [
          cliente_nome,
          cliente_telefone,
          data_agendamento,
          hora_agendamento,
          servico_id,
        ],
        function (err) {
          if (err) {
            console.error("Erro ao criar agendamento:", err);
            return res.status(500).json({ error: "Erro ao criar agendamento" });
          }
          res.status(201).json({
            message: "Agendamento confirmado",
            agendamento: {
              id: this.lastID,
              cliente_nome,
              cliente_telefone,
              data_agendamento,
              hora_agendamento,
              servico_id,
              servico_nome: servico.nome,
              servico_preco: servico.preco,
              status: "confirmado",
            },
          });
        }
      );
    }
  );
});

// ROTAS DO PAINEL ADMIN (protegidas)

//listas todos os servicos
app.get("/api/admin/servicos", authenticateToken, (req, res) => {
  db.all(
    "SELECT * FROM servicos ORDER BY ativo DESC, nome ASC",
    (err, rows) => {
      if (err) {
        console.error("Erro ao buscar serviços:", err);
        return res.status(500).json({ error: "Erro ao buscar serviços" });
      }
      res.json({ servicos: rows });
    }
  );
});

//lista nova de servico
app.post("/api/admin/servicos", authenticateToken, (req, res) => {
  const { nome, descricao, preco, duracao } = req.body;

  if (!nome || !preco) {
    return res.status(400).json({ error: "Nome e preço são obrigatórios" });
  }
  db.run(
    "INSERT INTO servicos (nome, descricao,preco,duracao) VALUES (?, ?, ?, ?)",
    [nome, descricao || null, preco, duracao || 30],
    function (err) {
      if (err) {
        console.error("Erro ao criar serviço:", err);
        return res.status(500).json({ error: "Erro ao criar serviço" });
      }
      res.status(201).json({
        message: "Serviço criado com sucesso",
        servico: {
          id: this.lastID,
        },
      });
    }
  );
});
// atualizar servico (adm)
app.put("/api/admin/servicos/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { nome, descricao, preco, duracao, ativo } = req.body;

  db.run(
    "UPDATE servicos SET nome = ?, descricao = ?, preco = ?, duracao = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [nome, descricao, preco, duracao, ativo, id],
    function (err) {
      if (err) {
        console.error("Erro ao atualizar serviço:", err);
        return res.status(500).json({ error: "Erro ao atualizar serviço" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }
      res.json({ message: "Serviço atualizado com sucesso" });
    }
  );
});

// Listar agendamentos
app.get("/api/admin/agendamentos", authenticateToken, (req, res) => {
  const { page = 1, limit = 10, data, status } = req.query;
  const offset = (page - 1) * limit;

  let query = `SELECT a.*, s.nome as servico_nome, s.preco as servico_preco FROM agendamentos a
  LEFT JOIN servicos s ON a.servico_id = s.id
  `;
  let countQuery = "SELECT COUNT(*) as total FROM agendamentos";
  const params = [];

  // Filtros
  const conditions = [];
  if (data) {
    conditions.push("a.data_agendamento = ?");
    params.push(data);
  }
  if (status) {
    conditions.push("a.status = ?");
    params.push(status);
  }

  if (conditions.length > 0) {
    const whereClause = " WHERE " + conditions.join(" AND ");
    query += whereClause;
    countQuery += whereClause.replace("a.", " "); //remove alias para count
  }

  query +=
    " ORDER BY data_agendamento DESC, hora_agendamento DESC LIMIT ? OFFSET ?";

  // Buscar total de registros
  db.get(countQuery, params, (err, countRow) => {
    if (err) {
      console.error("Erro ao contar registros:", err);
      return res.status(500).json({ error: "Erro ao contar registros" });
    }

    // Buscar agendamentos
    db.all(query, [...params, limit, offset], (err, rows) => {
      if (err) {
        console.error("Erro ao buscar agendamentos:", err);
        return res.status(500).json({ error: "Erro ao buscar agendamentos" });
      }
      res.json({
        agendamentos: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(countRow.total / limit),
          totalItems: countRow.total,
          limit: parseInt(limit),
        },
      });
    });
  });
});

// Atualizar status de agendamento
app.put("/api/admin/agendamentos/:id/status", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["confirmado", "cancelado", "concluido"].includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }

  db.run(
    "UPDATE agendamentos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [status, id],
    function (err) {
      if (err) {
        console.error("Erro ao atualizar status:", err);
        return res.status(500).json({ error: "Erro ao atualizar status" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      res.json({ message: "Status atualizado com sucesso" });
    }
  );
});

// Deletar agendamento
app.delete("/api/admin/agendamentos/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM agendamentos WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("Erro ao deletar agendamento:", err);
      return res.status(500).json({ error: "Erro ao deletar agendamento" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }
    res.json({ message: "Agendamento deletado com sucesso" });
  });
});

// Estatísticas do painel
app.get("/api/admin/estatisticas", authenticateToken, (req, res) => {
  const hoje = new Date().toISOString().split("T")[0];
  const mesAtual = hoje.substring(0, 7); // YYYY-MM

  // Agendamentos hoje
  db.get(
    `SELECT
     COUNT(*) as hoje,
     COALESCE(SUM(s.preco), 0) as receita_hoje
      FROM agendamentos a
      LEFT JOIN servicos s ON a.servico_id = s.id
      WHERE a.data_agendamento = ? AND a.status != ?`,
    [hoje, "cancelado"],
    (err, hojeRow) => {
      if (err) {
        console.error("Erro ao buscar estatísticas:", err);
        return res.status(500).json({ error: "Erro ao buscar estatísticas" });
      }

      // Total do mês
      const mesAtual = hoje.substring(0, 7); // YYYY-MM
      db.get(
        `SELECT
         COUNT(*) as mes,
         COALESCE(SUM(s.preco), 0) as receita_mes
         FROM agendamentos a
         LEFT JOIN servicos s ON a.servico_id = s.id
         WHERE a.data_agendamento LIKE ? AND a.status != ?`,
        [mesAtual + "%", "cancelado"],
        (err, mesRow) => {
          if (err) {
            console.error("Erro ao buscar estatísticas do mês:", err);
            return res
              .status(500)
              .json({ error: "Erro ao buscar estatísticas" });
          }

          // Total geral
          db.get(
            `SELECT
            COUNT(*) as total,
            COALESCE(SUM(s.preco), 0) as receita_total
            FROM agendamentos a
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.status != ?`,
            ["cancelado"],
            (err, totalRow) => {
              if (err) {
                console.error("Erro ao buscar estatísticas totais:", err);
                return res
                  .status(500)
                  .json({ error: "Erro ao buscar estatísticas" });
              }
              //servico mais vendido
              db.get(
                `SELECT s.nome, COUNT(*) as quantidade
                FROM agendamentos a
                JOIN servicos s ON a.servico_id = s.id
                WHERE a.status != ?
                GROUP BY a.servico_id, s.nome
                ORDER BY quantidade DESC
                LIMIT 1`,
                ["cancelado"],
                (err, servicoMaisVendido) => {
                  if (err) {
                    console.error("Erro ao buscar serviço mais vendido:", err);
                  }
                  res.json({
                    agendamentosHoje: hojeRow.hoje,
                    receitaHoje: hojeRow.receita_hoje || 0,
                    agendamentosMes: mesRow.mes,
                    receitaMes: mesRow.receita_mes || 0,
                    totalAgendamentos: totalRow.total,
                    receitaTotal: totalRow.receita_total || 0,
                    servicoPopular: servicoMaisVendido || {
                      nome: "Nenhum",
                      quantidade: 0,
                    },
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// listar serviços ativos(para o cliente)
app.get("/api/servicos", (req, res) => {
  db.all(
    "SELECT * FROM servicos WHERE ativo =1 ORDER BY preco ASC",
    (err, rows) => {
      if (err) {
        console.error("Erro ao buscar servicos:", err);
        return res.status(500).json({ error: "Erro ao buscar serviços" });
      }
      res.json({ servicos: rows });
    }
  );
});

//buscar servico especifico
app.get("/api/servicos/:id", (req, res) => {
  const { id } = req.params;
  db.get(
    "SELECT * FROM  servicos WHERE id = ? AND ativo = 1",
    [id],
    (err, servico) => {
      if (err) {
        console.error("Erro ao buscar serviço:", err);
        return res.status(500).json({ error: "Erro ao buscar serviço" });
      }
      if (!servico) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }
      res.json({ servico });
    }
  );
});

// Servir páginas estáticas
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  console.log(
    `Login admin: ${DEFAULT_ADMIN_USERNAME} / ${DEFAULT_ADMIN_PASSWORD}`
  );
});

// Tratamento de erros não capturados
process.on("uncaughtException", (err) => {
  console.error("Erro não capturado:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Promessa rejeitada não tratada:", reason);
});

// Desligamento normal
process.on("SIGINT", () => {
  console.log("\nEncerrando servidor...");
  db.close((err) => {
    if (err) {
      console.error("Erro ao fechar banco:", err.message);
    } else {
      console.log("Banco de dados fechado");
    }
    process.exit(0);
  });
});

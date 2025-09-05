const API_BASE_URL = "/api";
let currentPage = 1;
let currentToken = localStorage.getItem("adminToken");
let currentTab = "agendamentos";
let editingServicoId = null;

// Verificar se já está logado
if (currentToken) {
  showDashboard();
}

// Login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const submitBtn = e.target.querySelector("button");
  submitBtn.disabled = true;
  submitBtn.textContent = "Entrando...";

  try {
    const response = await fetch(`${API_BASE_URL}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      currentToken = data.token;
      localStorage.setItem("adminToken", currentToken);
      showDashboard();
    } else {
      showError("loginError", data.error);
    }
  } catch (error) {
    console.error("Erro no login:", error);
    showError("loginError", "Erro de conexão");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Entrar";
  }
});

function showDashboard() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  loadStats();
  loadAgendamentos();
}

function logout() {
  localStorage.removeItem("adminToken");
  currentToken = null;
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("dashboard").style.display = "none";
}

async function loadStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/estatisticas`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    if (response.ok) {
      const data = await response.json();
      document.getElementById("statsHoje").textContent = data.agendamentosHoje;
      document.getElementById(
        "receitaHoje"
      ).textContent = `R$ ${data.receitaHoje.toFixed(2).replace(".", ",")}`;
      document.getElementById("statsMes").textContent = data.agendamentosMes;
      document.getElementById("receitaMes").textContent = `R$ ${data.receitaMes
        .toFixed(2)
        .replace(".", ",")}`;
      document.getElementById("statsTotal").textContent =
        data.totalAgendamentos;
      document.getElementById("servicoPopular").textContent =
        data.servicoPopular.nome || "Nenhum";
    } else if (response.status === 401) {
      logout();
    }
  } catch (error) {
    console.error("Erro ao carregar estatísticas:", error);
  }
}

async function loadAgendamentos(page = 1) {
  document.getElementById("loading").style.display = "block";
  document.getElementById("agendamentosTable").style.display = "none";
  document.getElementById("pagination").style.display = "none";

  const filterData = document.getElementById("filterData").value;
  const filterStatus = document.getElementById("filterStatus").value;

  const params = new URLSearchParams({
    page: page.toString(),
    limit: "10",
  });

  if (filterData) params.append("data", filterData);
  if (filterStatus) params.append("status", filterStatus);

  try {
    const response = await fetch(
      `${API_BASE_URL}/admin/agendamentos?${params}`,
      {
        headers: { Authorization: `Bearer ${currentToken}` },
      }
    );

    if (response.ok) {
      const data = await response.json();
      renderAgendamentos(data.agendamentos);
      renderPagination(data.pagination);
      currentPage = page;
    } else if (response.status === 401) {
      logout();
    } else {
      showMessage("Erro ao carregar agendamentos", "error");
    }
  } catch (error) {
    console.error("Erro ao carregar agendamentos:", error);
    showMessage("Erro de conexão", "error");
  } finally {
    document.getElementById("loading").style.display = "none";
  }
}

// Função para formatar telefone
function formatPhone(phone) {
  if (!phone) return "";
  const clean = phone.replace(/\D/g, "");

  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  } else if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  return phone;
}

function renderAgendamentos(agendamentos) {
  const tbody = document.getElementById("agendamentosBody");
  tbody.innerHTML = "";

  if (agendamentos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="9" style="text-align: center;">Nenhum agendamento encontrado</td></tr>';
    document.getElementById("agendamentosTable").style.display = "table";
    return;
  }

  agendamentos.forEach((agendamento) => {
    const row = document.createElement("tr");
    const dataFormatada = new Date(
      agendamento.data_agendamento + "T00:00:00"
    ).toLocaleDateString("pt-BR");

    const telefoneFormatado = formatPhone(agendamento.cliente_telefone);
    const precoFormatado = agendamento.servico_preco
      ? `R$ ${agendamento.servico_preco.toFixed(2).replace(".", ",")}`
      : "N/A";

    row.innerHTML = `
      <td>${agendamento.id}</td>
      <td>${agendamento.cliente_nome}</td>
      <td>${telefoneFormatado}</td>
      <td>${agendamento.servico_nome || "N/A"}</td>
      <td>${precoFormatado}</td>
      <td>${dataFormatada}</td>
      <td>${agendamento.hora_agendamento}</td>
      <td><span class="status ${agendamento.status}">${
      agendamento.status
    }</span></td>
      <td>
        <div class="actions">
          ${
            agendamento.status !== "concluido"
              ? `<button class="btn-sm btn-success" onclick="updateStatus(${agendamento.id}, 'concluido')">✓ Concluir</button>`
              : ""
          }
          ${
            agendamento.status !== "cancelado"
              ? `<button class="btn-sm btn-warning" onclick="updateStatus(${agendamento.id}, 'cancelado')">✗ Cancelar</button>`
              : ""
          }
          <button class="btn-sm btn-danger" onclick="deleteAgendamento(${
            agendamento.id
          })">🗑️ Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("agendamentosTable").style.display = "table";
}

function renderPagination(pagination) {
  const paginationDiv = document.getElementById("pagination");
  paginationDiv.innerHTML = "";

  if (pagination.totalPages > 1) {
    // Botão anterior
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "← Anterior";
    prevBtn.disabled = pagination.currentPage === 1;
    prevBtn.onclick = () => loadAgendamentos(pagination.currentPage - 1);
    paginationDiv.appendChild(prevBtn);

    // Páginas
    for (let i = 1; i <= pagination.totalPages; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.textContent = i;
      if (i === pagination.currentPage) {
        pageBtn.className = "current";
      }
      pageBtn.onclick = () => loadAgendamentos(i);
      paginationDiv.appendChild(pageBtn);
    }

    // Botão próximo
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Próximo →";
    nextBtn.disabled = pagination.currentPage === pagination.totalPages;
    nextBtn.onclick = () => loadAgendamentos(pagination.currentPage + 1);
    paginationDiv.appendChild(nextBtn);

    paginationDiv.style.display = "flex";
  }
}

async function updateStatus(id, status) {
  if (!confirm(`Confirma alteração do status para "${status}"?`)) return;

  try {
    const response = await fetch(
      `${API_BASE_URL}/admin/agendamentos/${id}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ status }),
      }
    );

    if (response.ok) {
      showMessage("Status atualizado com sucesso!", "success");
      loadAgendamentos(currentPage);
      loadStats();
    } else {
      const data = await response.json();
      showMessage(data.error || "Erro ao atualizar status", "error");
    }
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    showMessage("Erro de conexão", "error");
  }
}

async function deleteAgendamento(id) {
  if (!confirm("Confirma a exclusão deste agendamento?")) return;

  try {
    const response = await fetch(`${API_BASE_URL}/admin/agendamentos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    if (response.ok) {
      showMessage("Agendamento excluído com sucesso!", "success");
      loadAgendamentos(currentPage);
      loadStats();
    } else {
      const data = await response.json();
      showMessage(data.error || "Erro ao excluir agendamento", "error");
    }
  } catch (error) {
    console.error("Erro ao excluir agendamento:", error);
    showMessage("Erro de conexão", "error");
  }
}

// ========== FUNÇÕES DE NAVEGAÇÃO POR ABAS ==========
function mostrarAba(aba) {
  // Remover classe active de todas as abas
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));

  // Ativar aba selecionada
  document
    .querySelector(`[onclick="mostrarAba('${aba}')"]`)
    .classList.add("active");
  document.getElementById(`tab-${aba}`).classList.add("active");

  currentTab = aba;

  // Carregar conteúdo da aba
  if (aba === "agendamentos") {
    loadAgendamentos();
  } else if (aba === "servicos") {
    loadServicos();
  }
}

// ========== FUNÇÕES DE SERVIÇOS ==========
async function loadServicos() {
  document.getElementById("servicosLoading").style.display = "block";
  document.getElementById("servicosTable").style.display = "none";

  try {
    const response = await fetch(`${API_BASE_URL}/admin/servicos`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    if (response.ok) {
      const data = await response.json();
      renderServicos(data.servicos);
    } else if (response.status === 401) {
      logout();
    } else {
      showMessage("Erro ao carregar serviços", "error");
    }
  } catch (error) {
    console.error("Erro ao carregar serviços:", error);
    showMessage("Erro de conexão", "error");
  } finally {
    document.getElementById("servicosLoading").style.display = "none";
  }
}

function renderServicos(servicos) {
  const tbody = document.getElementById("servicosBody");
  tbody.innerHTML = "";

  if (servicos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align: center;">Nenhum serviço encontrado</td></tr>';
    document.getElementById("servicosTable").style.display = "table";
    return;
  }

  servicos.forEach((servico) => {
    const row = document.createElement("tr");
    const precoFormatado = `R$ ${servico.preco.toFixed(2).replace(".", ",")}`;
    const statusClass = servico.ativo ? "ativo" : "inativo";
    const statusText = servico.ativo ? "Ativo" : "Inativo";

    row.innerHTML = `
      <td>${servico.id}</td>
      <td>${servico.nome}</td>
      <td>${servico.descricao || "-"}</td>
      <td>${precoFormatado}</td>
      <td>${servico.duracao} min</td>
      <td><span class="status ${statusClass}">${statusText}</span></td>
      <td>
        <div class="actions">
          <button class="btn-sm btn-primary" onclick="editarServico(${
            servico.id
          })">✏️ Editar</button>
          <button class="btn-sm ${
            servico.ativo ? "btn-warning" : "btn-success"
          }" 
                  onclick="toggleServicoStatus(${
                    servico.id
                  }, ${!servico.ativo})">
            ${servico.ativo ? "⏸️ Desativar" : "▶️ Ativar"}
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("servicosTable").style.display = "table";
}

function abrirModalServico() {
  editingServicoId = null;
  document.getElementById("modalServicoTitulo").textContent = "Novo Serviço";
  document.getElementById("btnSalvarServico").textContent = "Criar Serviço";

  // Limpar campos
  document.getElementById("formServico").reset();
  document.getElementById("servicoAtivo").checked = true;

  document.getElementById("modalServico").style.display = "flex";
}

function editarServico(id) {
  // Buscar dados do serviço
  fetch(`${API_BASE_URL}/admin/servicos`, {
    headers: { Authorization: `Bearer ${currentToken}` },
  })
    .then((response) => response.json())
    .then((data) => {
      const servico = data.servicos.find((s) => s.id === id);
      if (servico) {
        editingServicoId = id;
        document.getElementById("modalServicoTitulo").textContent =
          "Editar Serviço";
        document.getElementById("btnSalvarServico").textContent =
          "Atualizar Serviço";

        // Preencher campos
        document.getElementById("servicoNome").value = servico.nome;
        document.getElementById("servicoDescricao").value =
          servico.descricao || "";
        document.getElementById("servicoPreco").value = servico.preco;
        document.getElementById("servicoDuracao").value = servico.duracao;
        document.getElementById("servicoAtivo").checked = servico.ativo;

        document.getElementById("modalServico").style.display = "flex";
      }
    })
    .catch((error) => {
      console.error("Erro ao buscar serviço:", error);
      showMessage("Erro ao carregar dados do serviço", "error");
    });
}

function fecharModalServico() {
  document.getElementById("modalServico").style.display = "none";
  editingServicoId = null;
}

// Handler do formulário de serviços
document.addEventListener("DOMContentLoaded", function () {
  const formServico = document.getElementById("formServico");
  if (formServico) {
    formServico.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = document.getElementById("servicoNome").value;
      const descricao = document.getElementById("servicoDescricao").value;
      const preco = parseFloat(document.getElementById("servicoPreco").value);
      const duracao =
        parseInt(document.getElementById("servicoDuracao").value) || 30;
      const ativo = document.getElementById("servicoAtivo").checked;

      const btnSalvar = document.getElementById("btnSalvarServico");
      const originalText = btnSalvar.textContent;
      btnSalvar.disabled = true;
      btnSalvar.textContent = "Salvando...";

      try {
        const url = editingServicoId
          ? `${API_BASE_URL}/admin/servicos/${editingServicoId}`
          : `${API_BASE_URL}/admin/servicos`;

        const method = editingServicoId ? "PUT" : "POST";

        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ nome, descricao, preco, duracao, ativo }),
        });

        if (response.ok) {
          const action = editingServicoId ? "atualizado" : "criado";
          showMessage(`Serviço ${action} com sucesso!`, "success");
          fecharModalServico();
          loadServicos();
        } else {
          const data = await response.json();
          showMessage(data.error || "Erro ao salvar serviço", "error");
        }
      } catch (error) {
        console.error("Erro ao salvar serviço:", error);
        showMessage("Erro de conexão", "error");
      } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = originalText;
      }
    });
  }
});

async function toggleServicoStatus(id, ativo) {
  const action = ativo ? "ativar" : "desativar";
  if (!confirm(`Confirma ${action} este serviço?`)) return;

  try {
    // Buscar dados atuais do serviço
    const responseGet = await fetch(`${API_BASE_URL}/admin/servicos`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    if (!responseGet.ok) throw new Error("Erro ao buscar serviço");

    const data = await responseGet.json();
    const servico = data.servicos.find((s) => s.id === id);

    if (!servico) throw new Error("Serviço não encontrado");

    // Atualizar status
    const response = await fetch(`${API_BASE_URL}/admin/servicos/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify({
        nome: servico.nome,
        descricao: servico.descricao,
        preco: servico.preco,
        duracao: servico.duracao,
        ativo: ativo,
      }),
    });

    if (response.ok) {
      showMessage(
        `Serviço ${
          action === "ativar" ? "ativado" : "desativado"
        } com sucesso!`,
        "success"
      );
      loadServicos();
    } else {
      const errorData = await response.json();
      showMessage(errorData.error || "Erro ao alterar status", "error");
    }
  } catch (error) {
    console.error("Erro ao alterar status:", error);
    showMessage("Erro de conexão", "error");
  }
}

function showMessage(message, type) {
  const messageDiv = document.getElementById("message");
  messageDiv.textContent = message;
  messageDiv.className = type === "error" ? "error-message" : "success-message";
  messageDiv.style.display = "block";

  setTimeout(() => {
    messageDiv.style.display = "none";
  }, 5000);
}

function showError(elementId, message) {
  const errorDiv = document.getElementById(elementId);
  errorDiv.textContent = message;
  errorDiv.style.display = "block";

  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}

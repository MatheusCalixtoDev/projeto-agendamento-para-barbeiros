// script.js
const HORARIO_INICIO = 9;
const HORARIO_FIM = 18;
const URL_BASE_API = "/api";
let servicos = [];
let servicoSelecionado = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const mesesPt = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const diasSemanaPt = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function preencherZero(n) {
  return String(n).padStart(2, "0");
}

function formatarChaveData(y, m, d) {
  return `${y}-${preencherZero(m + 1)}-${preencherZero(d)}`;
}

// Mostrar notificação toast
function mostrarToast(mensagem) {
  const toast = $("#toast");
  if (toast) {
    toast.textContent = mensagem;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }
}

// Definir ano atual no rodapé
function definirAnoAtual() {
  const anoSpan = $("#year");
  if (anoSpan) {
    anoSpan.textContent = new Date().getFullYear();
  }
}

// Revelar elementos no scroll
const revelar = () => {
  const alturaJanela = window.innerHeight;
  $$("section").forEach((s) => {
    if (s.getBoundingClientRect().top < alturaJanela - 80)
      s.classList.add("visible");
  });
};
window.addEventListener("scroll", revelar);
revelar();

// Estado do calendário
let visualizacao = ((d) => ({ y: d.getFullYear(), m: d.getMonth() }))(
  new Date()
);
let selecionado = null;

const mesCalendario = $("#calMonth");
const anoCalendario = $("#calYear");
const gradeCalendario = $("#calGrid");

function construirCalendario() {
  mesCalendario.textContent = mesesPt[visualizacao.m];
  anoCalendario.textContent = visualizacao.y;

  gradeCalendario.innerHTML = "";

  // cabeçalho dos dias da semana
  diasSemanaPt.forEach((dia) => {
    const elemento = document.createElement("div");
    elemento.className = "dow";
    elemento.textContent = dia;
    gradeCalendario.appendChild(elemento);
  });

  const primeiro = new Date(visualizacao.y, visualizacao.m, 1);
  const diaInicio = primeiro.getDay();
  const ultimo = new Date(visualizacao.y, visualizacao.m + 1, 0).getDate();

  // Dias vazios no início
  for (let i = 0; i < diaInicio; i++) {
    const elemento = document.createElement("div");
    elemento.className = "day muted";
    gradeCalendario.appendChild(elemento);
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Dias do mês
  for (let d = 1; d <= ultimo; d++) {
    const celula = document.createElement("button");
    celula.type = "button";
    celula.className = "day";
    celula.textContent = d;
    const objetoData = new Date(visualizacao.y, visualizacao.m, d);
    objetoData.setHours(0, 0, 0, 0);

    if (objetoData < hoje) {
      celula.classList.add("disabled");
      celula.disabled = true;
    }

    celula.addEventListener("click", () =>
      selecionarData(visualizacao.y, visualizacao.m, d, celula)
    );
    gradeCalendario.appendChild(celula);
  }

  $$(".day.selected").forEach((el) => el.classList.remove("selected"));
}

function selecionarData(y, m, d, celula) {
  $$(".day").forEach((el) => el.classList.remove("selected"));
  if (celula) {
    celula.classList.add("selected");
  }
  selecionado = { y, m, d };
  const chave = formatarChaveData(y, m, d);
  $("#selectedDate").textContent = new Date(y, m, d).toLocaleDateString(
    "pt-BR"
  );
  $("#hiddenDate").value = chave;
  renderizarHorarios(chave);
  atualizarResumo();
  verificarFormularioCompleto();
}

$("#prevMonth").addEventListener("click", () => {
  visualizacao.m--;
  if (visualizacao.m < 0) {
    visualizacao.m = 11;
    visualizacao.y--;
  }
  construirCalendario();
});

$("#nextMonth").addEventListener("click", () => {
  visualizacao.m++;
  if (visualizacao.m > 11) {
    visualizacao.m = 0;
    visualizacao.y++;
  }
  construirCalendario();
});

function gerarTodosHorarios() {
  const horarios = [];
  for (let h = HORARIO_INICIO; h <= HORARIO_FIM; h++) {
    horarios.push(`${preencherZero(h)}:00`);
  }
  return horarios;
}

// buscar horários ocupados da API
async function buscarHorariosOcupados(chaveData) {
  try {
    const resposta = await fetch(
      `${URL_BASE_API}/agendamentos/data/${chaveData}`
    );
    if (!resposta.ok) {
      throw new Error("Erro ao buscar horários ocupados");
    }
    const dados = await resposta.json();
    return dados.horariosOcupados || [];
  } catch (erro) {
    console.log("Erro ao buscar horários ocupados", erro);
    return [];
  }
}

// salvar agendamentos via API
async function salvarAgendamento(
  chaveData,
  horario,
  nome,
  telefone,
  servicoId
) {
  try {
    const resposta = await fetch(`${URL_BASE_API}/agendamentos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cliente_nome: nome,
        cliente_telefone: telefone,
        data_agendamento: chaveData,
        hora_agendamento: horario,
        servico_id: servicoId,
      }),
    });
    const dados = await resposta.json();

    if (resposta.ok) {
      return { sucesso: true, mensagem: dados.message };
    } else {
      return { sucesso: false, mensagem: dados.error };
    }
  } catch (erro) {
    console.log("Erro ao salvar agendamento:", erro);
    return { sucesso: false, mensagem: "Erro de conexão com servidor" };
  }
}

async function renderizarHorarios(chaveData) {
  const container = $("#slots");
  container.innerHTML = "Carregando horários...";
  const todosHorarios = gerarTodosHorarios();

  try {
    // busca horários ocupados da API
    const horariosOcupados = await buscarHorariosOcupados(chaveData);
    container.innerHTML = "";
    const ocupados = new Set(horariosOcupados || []);

    todosHorarios.forEach((horario) => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "slot";
      botao.textContent = horario;
      if (ocupados.has(horario)) botao.classList.add("taken");

      botao.addEventListener("click", () => {
        $$(".slot").forEach((s) => s.classList.remove("selected"));
        if (!botao.classList.contains("taken")) {
          botao.classList.add("selected");
          $("#hiddenTime").value = horario;
          atualizarResumo();
          verificarFormularioCompleto();
        }
      });
      container.appendChild(botao);
    });
  } catch (e) {
    container.innerHTML = "Erro ao carregar horários.";
    console.error("Erro:", e);
  }
}

// formulário
$("#bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const botaoSubmit = e.target.querySelector('button[type="submit"]');
  const textoOriginal = botaoSubmit.textContent;

  // desabilita o botão e mostra loading
  botaoSubmit.disabled = true;
  botaoSubmit.textContent = "Confirmando...";

  const nome = $("#clientName").value.trim();
  const telefone = limparTelefone($("#clientPhone").value.trim());
  const chaveData = $("#hiddenDate").value;
  const horario = $("#hiddenTime").value;
  const servicoId = $("#hiddenServicoId").value;

  if (!servicoId || !servicoSelecionado) {
    alert("Selecione um serviço.");
    botaoSubmit.disabled = false;
    botaoSubmit.textContent = textoOriginal;
    return;
  }

  if (!chaveData) {
    alert("Selecione uma data no calendário.");
    botaoSubmit.disabled = false;
    botaoSubmit.textContent = textoOriginal;
    return;
  }

  if (!horario) {
    alert("Selecione um horário disponível.");
    botaoSubmit.disabled = false;
    botaoSubmit.textContent = textoOriginal;
    return;
  }

  if (!telefone || telefone.length < 10) {
    alert("Digite um telefone válido.");
    botaoSubmit.disabled = false;
    botaoSubmit.textContent = textoOriginal;
    return;
  }

  // salva via api
  try {
    const resultado = await salvarAgendamento(
      chaveData,
      horario,
      nome,
      telefone,
      servicoId
    );

    if (resultado.sucesso) {
      mostrarToast(resultado.mensagem);
      renderizarHorarios(chaveData); // atualiza os horários
      $("#bookingForm").reset();
      $("#hiddenTime").value = "";
      $("#hiddenServicoId").value = "";
      servicoSelecionado = null;

      // Remove seleções visuais
      $$(".servico-card").forEach((card) => card.classList.remove("selected"));
      $$(".slot").forEach((slot) => slot.classList.remove("selected"));
      atualizarResumo();

      // Notificar barbeiro automaticamente
      const dataFormatada = new Date(chaveData).toLocaleDateString("pt-br");
      const telefoneFormatado = formatarTelefone(telefone);

      setTimeout(() => {
        // Envia notificação para o BARBEIRO
        notificarBarbeiro(nome, telefoneFormatado, dataFormatada, horario);

        // Pergunta se cliente quer confirmação também
        if (
          confirm(
            "Agendamento confirmado! Deseja receber confirmação no WhatsApp?"
          )
        ) {
          enviarConfirmacaoWhatsApp(nome, dataFormatada, horario, telefone);
        }
      }, 1000);
    } else {
      alert(resultado.mensagem);
      renderizarHorarios(chaveData);
    }
  } catch (erro) {
    console.log("Erro no agendamento:", erro);
    alert("Erro ao confirmar agendamento. Tente novamente");
  } finally {
    // reabilita o botão
    botaoSubmit.disabled = false;
    botaoSubmit.textContent = textoOriginal;
  }
});

function notificarBarbeiro(nomeCliente, telefoneCliente, data, horario) {
  const telefoneBarbeiro = "5511937781104"; // WhatsApp do barbeiro
  const mensagem = `🔔 NOVO AGENDAMENTO!

👤 Cliente: ${nomeCliente}
📞 Telefone: ${telefoneCliente}
📅 Data: ${data}
🕐 Horário: ${horario}
💈 Serviço: ${servicoSelecionado ? servicoSelecionado.nome : "N/A"}

Acesse o painel: ${window.location.origin}/admin`;

  const url = `https://wa.me/${telefoneBarbeiro}?text=${encodeURIComponent(
    mensagem
  )}`;
  window.open(url, "_blank");
}

function enviarConfirmacaoWhatsApp(nome, data, horario, telefoneClean) {
  const texto = `Olá ${nome}! Seu agendamento na Yuri Cort's foi confirmado para ${data} às ${horario}. 💈✅`;
  const url = `https://wa.me/55${telefoneClean}?text=${encodeURIComponent(
    texto
  )}`;
  window.open(url, "_blank");
}

function mascaraTelefone(valor) {
  // Remove tudo que não é número
  valor = valor.replace(/\D/g, "");

  // Aplica a máscara conforme o tamanho
  if (valor.length <= 10) {
    // Telefone fixo: (11) 1234-5678
    valor = valor.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  } else {
    // Celular: (11) 91234-5678
    valor = valor.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }

  return valor;
}

// Aplica máscara em tempo real no campo
function configurarMascaraTelefone(idInput) {
  const input = document.getElementById(idInput);
  if (!input) return;

  input.addEventListener("input", (e) => {
    e.target.value = mascaraTelefone(e.target.value);
  });

  // Aplica máscara quando cola texto
  input.addEventListener("paste", (e) => {
    setTimeout(() => {
      e.target.value = mascaraTelefone(e.target.value);
    }, 10);
  });
}

// FUNÇÃO PARA LIMPAR TELEFONE (para enviar para API)
function limparTelefone(telefone) {
  return telefone.replace(/\D/g, ""); // Remove tudo que não é número
}

// FUNÇÃO PARA FORMATAR TELEFONE (para exibir)
function formatarTelefone(telefone) {
  if (!telefone) return "";
  const limpo = telefone.replace(/\D/g, "");

  if (limpo.length === 10) {
    return limpo.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  } else if (limpo.length === 11) {
    return limpo.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  return telefone;
}

// ===== FUNÇÃO PARA CARREGAR SERVIÇOS =====
async function carregarServicos() {
  try {
    const gridServicos = document.getElementById("servicosGrid");
    gridServicos.innerHTML =
      '<div class="servicos-loading">Carregando serviços...</div>';

    const resposta = await fetch("/api/servicos");
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.error || "Erro ao carregar serviços");
    }

    servicos = dados.servicos;
    renderizarServicos();
  } catch (erro) {
    console.error("Erro ao carregar serviços:", erro);
    document.getElementById("servicosGrid").innerHTML =
      '<div class="servicos-error">Erro ao carregar serviços. Tente recarregar a página.</div>';
  }
}

// ===== FUNÇÃO PARA RENDERIZAR SERVIÇOS =====
function renderizarServicos() {
  const gridServicos = document.getElementById("servicosGrid");

  if (servicos.length === 0) {
    gridServicos.innerHTML =
      '<div class="servicos-error">Nenhum serviço disponível no momento.</div>';
    return;
  }

  const servicosHTML = servicos
    .map(
      (servico) => `
    <div class="servico-card" onclick="selecionarServico(${
      servico.id
    })" id="servico-${servico.id}">
      <div class="servico-nome">${servico.nome}</div>
      <div class="servico-descricao">${servico.descricao || ""}</div>
      <div class="servico-info">
        <div class="servico-preco">R$ ${parseFloat(servico.preco).toFixed(
          2
        )}</div>
        <div class="servico-duracao">${servico.duracao} min</div>
      </div>
    </div>
  `
    )
    .join("");

  gridServicos.innerHTML = servicosHTML;
}

// ===== FUNÇÃO PARA SELECIONAR SERVIÇO =====
function selecionarServico(servicoId) {
  // Remove seleção anterior
  document.querySelectorAll(".servico-card").forEach((card) => {
    card.classList.remove("selected");
  });

  // Adiciona seleção ao serviço clicado
  const cardSelecionado = document.getElementById(`servico-${servicoId}`);
  if (cardSelecionado) {
    cardSelecionado.classList.add("selected");
  }

  // Salva o serviço selecionado
  servicoSelecionado = servicos.find((s) => s.id === servicoId);

  // Atualiza campos ocultos
  document.getElementById("hiddenServicoId").value = servicoId;

  // Atualiza resumo
  atualizarResumo();

  // Verifica se formulário está completo
  verificarFormularioCompleto();

  console.log("Serviço selecionado:", servicoSelecionado);
}

// ===== FUNÇÃO PARA ATUALIZAR RESUMO =====
function atualizarResumo() {
  const resumoAgendamento = document.getElementById("resumoAgendamento");
  const resumoServico = document.getElementById("resumoServico");
  const resumoPreco = document.getElementById("resumoPreco");
  const resumoHorario = document.getElementById("resumoHorario");

  if (servicoSelecionado) {
    resumoServico.textContent = servicoSelecionado.nome;
    resumoPreco.textContent = `R$ ${parseFloat(
      servicoSelecionado.preco
    ).toFixed(2)}`;
  }

  const horarioSelecionado =
    document.querySelector(".slot.selected")?.textContent;
  if (horarioSelecionado) {
    resumoHorario.textContent = horarioSelecionado;
  }

  // Mostra o resumo se tem pelo menos serviço
  if (servicoSelecionado) {
    resumoAgendamento.style.display = "block";
  }
}

function verificarFormularioCompleto() {
  const botaoSubmit = document.querySelector(".btn-primary-submit");
  const temServico = servicoSelecionado !== null;
  const temData = document.getElementById("hiddenDate").value !== "";
  const temHorario = document.getElementById("hiddenTime").value !== "";

  if (botaoSubmit) {
    botaoSubmit.disabled = !(temServico && temData && temHorario);
  }
}

// ===== INICIALIZAÇÃO =====
document.addEventListener("DOMContentLoaded", () => {
  // Configurar máscara de telefone
  configurarMascaraTelefone("clientPhone");

  // Definir ano atual
  definirAnoAtual();

  // Carregar serviços
  carregarServicos();

  // Construir calendário inicial
  construirCalendario();

  console.log("Sistema de agendamento inicializado com sucesso!");
});

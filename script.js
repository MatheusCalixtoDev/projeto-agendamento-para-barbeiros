// script.js
const HOUR_START = 9;
const HOUR_END = 18;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const ptMonths = [
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
const ptWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function pad(n) {
  return String(n).padStart(2, "0");
}
function fmtDateKey(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

// Reveal on scroll
const reveal = () => {
  const winH = window.innerHeight;
  $$("section").forEach((s) => {
    if (s.getBoundingClientRect().top < winH - 80) s.classList.add("visible");
  });
};
window.addEventListener("scroll", reveal);
reveal();

// Calendar state
let view = ((d) => ({ y: d.getFullYear(), m: d.getMonth() }))(new Date());
let selected = null;

const calMonth = $("#calMonth");
const calYear = $("#calYear");
const calGrid = $("#calGrid");

function buildCalendar() {
  calMonth.textContent = ptMonths[view.m];
  calYear.textContent = view.y;

  calGrid.innerHTML = "";
  // header dow
  ptWeek.forEach((w) => {
    const el = document.createElement("div");
    el.className = "dow";
    el.textContent = w;
    calGrid.appendChild(el);
  });

  const first = new Date(view.y, view.m, 1);
  const startDay = first.getDay();
  const last = new Date(view.y, view.m + 1, 0).getDate();
  for (let i = 0; i < startDay; i++) {
    const e = document.createElement("div");
    e.className = "day muted";
    calGrid.appendChild(e);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = 1; d <= last; d++) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day";
    cell.textContent = d;
    const dateObj = new Date(view.y, view.m, d);
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj < today) {
      cell.classList.add("disabled");
      cell.disabled = true;
    }

    cell.addEventListener("click", () => selectDate(view.y, view.m, d, cell));
    calGrid.appendChild(cell);
  }

  $$(".day.selected").forEach((el) => el.classList.remove("selected"));
}

function selectDate(y, m, d, cell) {
  $$(".day").forEach((el) => el.classList.remove("selected"));
  if (cell) {
    cell.classList.add("selected");
  }
  selected = { y, m, d };
  const key = fmtDateKey(y, m, d);
  $("#selectedDate").textContent = new Date(y, m, d).toLocaleDateString(
    "pt-BR"
  );
  $("#hiddenDate").value = key;
  renderSlots(key);
}

$("#prevMonth").addEventListener("click", () => {
  view.m--;
  if (view.m < 0) {
    view.m = 11;
    view.y--;
  }
  buildCalendar();
});
$("#nextMonth").addEventListener("click", () => {
  view.m++;
  if (view.m > 11) {
    view.m = 0;
    view.y++;
  }
  buildCalendar();
});

function generateAllSlots() {
  const slots = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) slots.push(`${pad(h)}:00`);
  return slots;
}

async function fetchBooked(dateKey) {
  const res = await fetch(`/api/bookings/${dateKey}`);
  if (!res.ok) return { bookedTimes: [] };
  return res.json();
}

//btn confirmação de agendamento

document
  .querySelector(".btn-primary-submit")
  .addEventListener("click", function () {
    confirmarAgendamento();
  });

function confirmarAgendamento() {
  alert("Agendamento confirmado!");
}

async function renderSlots(dateKey) {
  const wrap = $("#slots");
  wrap.innerHTML = "Carregando horários...";
  const all = generateAllSlots();
  try {
    const { bookedTimes } = await fetchBooked(dateKey);
    wrap.innerHTML = "";
    const taken = new Set(bookedTimes || []);
    all.forEach((time) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot";
      btn.textContent = time;
      if (taken.has(time)) btn.classList.add("taken");
      btn.addEventListener("click", () => {
        $$(".slot").forEach((s) => s.classList.remove("selected"));
        if (!btn.classList.contains("taken")) {
          btn.classList.add("selected");
          $("#hiddenTime").value = time;
        }
      });
      wrap.appendChild(btn);
    });
  } catch (e) {
    wrap.innerHTML = "Erro ao carregar horários.";
  }
}

$("#bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#clientName").value.trim();
  const phone = $("#clientPhone").value.trim();
  const dateKey = $("#hiddenDate").value;
  const time = $("#hiddenTime").value;

  if (!dateKey) {
    alert("Selecione uma data no calendário.");
    return;
  }
  if (!time) {
    alert("Selecione um horário disponível.");
    return;
  }

  const res = await fetch("/api/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, date: dateKey, time }),
  });

  const data = await res.json();
  if (res.ok) {
    showToast(data.message || "Agendado!");
    renderSlots(dateKey);
    $("#bookingForm").reset();
    $("#hiddenTime").value = "";
  } else {
    alert(data.message || "Erro ao reservar");
    renderSlots(dateKey);
  }
});

function showToast(msg) {
  const toast = $("#toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

// Init
(function init() {
  buildCalendar();
  const t = new Date();
  if (t.getHours() >= 18) t.setDate(t.getDate() + 1);
  selectDate(t.getFullYear(), t.getMonth(), t.getDate());
  $("#year").textContent = new Date().getFullYear();
})();

// --- WhatsApp Click-to-Chat ---
function sendWhatsAppConfirmation(name, date, time) {
  const phone = "5582999296678"; // número do salão
  const text = `Olá ${name}! Seu agendamento na Yuri Cort's foi confirmado para ${date} às ${time}.`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

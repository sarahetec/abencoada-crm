import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const $ = (id) => document.getElementById(id);

const DEFAULT_STATUSES = [
  "Pendente",
  "Mensagem enviada",
  "Retornar depois",
  "Visita marcada",
  "Visita realizada",
  "Sem resposta",
  "Sem ZAP — somente ligação",
  "Não tem interesse",
  "Convertido"
];

const DEFAULT_DEVELOPMENTS = [
  { name: "Dom Parque", is_default: true },
  { name: "Dom Barueri", is_default: false },
  { name: "Outro", is_default: false }
];

const DEFAULT_MESSAGES = [
  [1, "Primeira abordagem", "Olá, [NOME]! Tudo bem? 😊 Sou assistente da corretora Abençoada. Recebemos seu interesse no empreendimento [EMPREENDIMENTO], em Barueri, e estou entrando em contato para te apresentar esse projeto! Gostaria de saber: você teria disponibilidade para conhecer o empreendimento esta semana?"],
  [2, "Cliente interessado", "Olá, [NOME]! Que bom saber do seu interesse! 😊 Para organizar o melhor atendimento, gostaria de entender como prefere conhecer o empreendimento: presencialmente, por videochamada ou por telefone?"],
  [3, "Não pode visitar", "Olá, [NOME]! Sem problemas! 😊 Podemos conversar por telefone ou WhatsApp para eu te apresentar melhor o projeto. Qual seria o melhor horário para você?"],
  [4, "Oferecer horários", "Olá, [NOME]! Tenho algumas opções de horário para conversarmos: manhã (9h às 11h), horário de almoço (12h às 14h), tarde (15h às 17h) ou noite (18h às 20h). Qual período funciona melhor para você? Vou confirmar a disponibilidade antes de agendar."],
  [5, "Prefere WhatsApp", "Olá, [NOME]! Claro! Podemos conversar por here mesmo. 😊 Gostaria de reservar alguns minutinhos para apresentar o projeto e entender o que você procura. Você consegue conversar hoje? Qual horário seria melhor?"],
  [6, "Prefere telefone", "Olá, [NOME]! Perfeito! 😊 Para nossa ligação, você prefere o período da manhã ou da tarde? Assim consigo organizar o melhor horário."],
  [7, "Prefere videochamada", "Olá, [NOME]! Ótimo! Podemos fazer uma videochamada pelo WhatsApp para apresentar o empreendimento. Qual horário fica melhor para você?"],
  [8, "Sem tempo", "Olá, [NOME]! Entendo perfeitamente! Podemos fazer uma conversa rápida, de 5 a 10 minutos, só para apresentar os principais pontos. Qual período costuma ser mais tranquilo para você?"],
  [9, "Pergunta sobre preço", "Olá, [NOME]! Os valores e condições podem variar conforme a opção escolhida. Para te orientar corretamente, podemos organizar uma conversa rápida e entender o que você procura. Qual seria o melhor horário?"],
  [10, "Pergunta sobre disponibilidade", "Olá, [NOME]! Posso consultar as opções disponíveis para você. A corretora consegue apresentar os planos e verificar as unidades. Podemos conversar hoje para entender melhor o que você procura?"],
  [11, "Visualizou e não respondeu", "Olá, [NOME]! Tudo bem? Passando para saber se conseguiu ver minha mensagem anterior e se ainda tem interesse em conhecer o [EMPREENDIMENTO]. Se preferir, podemos combinar um atendimento rápido, sem compromisso. 😊"],
  [12, "Segunda tentativa", "Olá, [NOME]! Tudo bem? Estou retomando nosso contato sobre o [EMPREENDIMENTO]. Gostaria de saber se ainda tem interesse em conhecer o empreendimento. Podemos conversar por telefone, videochamada ou WhatsApp, como preferir. 😊"],
  [13, "Vai pensar", "Olá, [NOME]! Claro, fique à vontade para avaliar com calma! 😊 Se ajudar, podemos fazer uma conversa rápida para você conhecer melhor o projeto antes de decidir."],
  [14, "Outro momento", "Olá, [NOME]! Sem problemas! Podemos combinar para outro dia. Qual dia da próxima semana costuma ser melhor para você?"],
  [15, "Confirmação de visita", "Olá, [NOME]! 😊 Passando para confirmar nossa visita ao [EMPREENDIMENTO].\n\n📅 Data: [DATA]\n⏰ Horário: [HORÁRIO]\n\nSerá um prazer receber você!"],
  [16, "Confirmação de atendimento", "Olá, [NOME]! 😊 Confirmando nosso atendimento:\n\n📅 Data: [DATA]\n⏰ Horário: [HORÁRIO]\n📍 Modalidade: [LIGAÇÃO / VIDEOCHAMADA / WHATSAPP]\n\nAté lá!"],
  [17, "Não conseguiu contato", "Olá, [NOME]! Tudo bem? Tentei entrar em contato, mas não conseguimos conversar. Qual seria o melhor horário para tentar novamente? 😊"],
  [18, "Convite após conversa", "Olá, [NOME]! Foi muito bom conversar com você! 😊 Que tal agendarmos uma visita para conhecer o [EMPREENDIMENTO] pessoalmente? Assim você consegue entender melhor o projeto."],
  [19, "Interessado, mas indeciso", "Olá, [NOME]! Entendo, é importante avaliar com tranquilidade. Se quiser, posso organizar uma conversa com a corretora para esclarecer suas dúvidas e apresentar as opções disponíveis."],
  [20, "Encerramento cordial", "Olá, [NOME]! Agradeço pela atenção e pelo tempo! 😊 Se surgir interesse ou alguma dúvida sobre o [EMPREENDIMENTO], fico à disposição. Tenha um ótimo dia!"]
];

const LEADS_PAGE_SIZE = 100;

let db = null;
let user = null;
let leads = [];
let customStatuses = [];
let customDevelopments = [];
let customMessages = [];

let selectedLead = null;
let leadsPendingDeletion = [];
let selectionMode = false;
let selectedLeadIds = new Set();
let currentFilteredLeads = [];
let currentWorkbook = null;
let parsedImportRows = [];
let visibleLeadsLimit = LEADS_PAGE_SIZE;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

function sanitizeText(val) {
  return String(val ?? "")
    .replace(/\u0000/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
    .trim();
}

const toast = (msg) => {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 3500);
};

const slug = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");

function getStatusNames() {
  return customStatuses.length
    ? customStatuses.map((s) => s.name)
    : [...DEFAULT_STATUSES];
}

function getDevelopmentNames() {
  return customDevelopments.length
    ? customDevelopments.map((d) => d.name)
    : DEFAULT_DEVELOPMENTS.map((d) => d.name);
}

function getDefaultDevelopmentName() {
  const def = customDevelopments.find((d) => d.is_default);
  if (def) return def.name;
  const names = getDevelopmentNames();
  return names[0] || "Dom Parque";
}

function getFirstName(fullName) {
  const clean = sanitizeText(fullName)
    .replace(/^(sr\.?|sra\.?|dr\.?|dra\.?)\s+/i, "")
    .replace(/[^a-zA-ZÀ-ÿ\s'-]/g, " ")
    .trim();
  if (!clean) return "";
  const first = clean.split(/\s+/)[0];
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function phoneDigits(raw) {
  let text = sanitizeText(raw);
  if (!text) return "";

  text = text.split(/[\/;|]|(?:\s+ou\s+)/i)[0].trim();

  if (/^\d+[.,]\d+e\+\d+$/i.test(text)) {
    const num = Number(text.replace(",", "."));
    if (!Number.isNaN(num)) {
      text = String(Math.round(num));
    }
  }

  let d = text.replace(/\D/g, "");
  if (!d) return "";

  if (d.startsWith("00") && d.length >= 12) {
    d = d.slice(2);
  }

  while (d.startsWith("55") && (d.length === 12 || d.length === 13 || d.length === 14)) {
    d = d.slice(2);
  }

  if (d.startsWith("0") && (d.length === 11 || d.length === 12)) {
    d = d.slice(1);
  }

  return d;
}

function normalizePhoneForStorage(raw) {
  const digits = phoneDigits(raw);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return sanitizeText(raw);
}

function adaptMessageForLead(msgText, lead) {
  let text = String(msgText || customMessages[0]?.content || DEFAULT_MESSAGES[0][2]);
  const firstName = getFirstName(lead?.name);
  const devName = sanitizeText(lead?.development) || getDefaultDevelopmentName();

  if (firstName) {
    text = text.replace(/\[NOME\]/gi, firstName);
  } else {
    text = text.replace(/,\s*\[NOME\]/gi, "").replace(/\[NOME\]/gi, "");
  }

  text = text.replace(/\[EMPREENDIMENTO\]/gi, devName);

  if (devName && devName !== "Dom Parque") {
    text = text.replace(/Dom Parque/g, devName);
  }

  return text;
}

function buildWhatsAppAppUrl(lead, rawMessage) {
  const digits = phoneDigits(lead?.phone);
  if (!digits || digits.length < 8) {
    return null;
  }
  const fullPhone = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  const message = adaptMessageForLead(rawMessage, lead);
  return `whatsapp://send?phone=${fullPhone}&text=${encodeURIComponent(message)}`;
}

function openWhatsAppForLead(lead, msgIndex = 0) {
  const template = customMessages[msgIndex]?.content || DEFAULT_MESSAGES[0][2];
  const appUrl = buildWhatsAppAppUrl(lead, template);
  if (!appUrl) {
    toast("Este contato não possui números suficientes no telefone.");
    return;
  }
  window.location.href = appUrl;
}

function translateSupabaseError(err) {
  if (!err) return "Erro desconhecido.";
  const msg = String(err.message || err);
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "Falha de rede ao conectar ao Supabase. Verifique a URL do projeto e sua conexão.";
  }
  if (msg.includes("Invalid API key") || msg.includes("apikey")) {
    return "Chave publicável (anon/public) inválida. Confira em Project Settings > API no Supabase.";
  }
  if (msg.includes("row-level security") || err.code === "42501") {
    return "Permissão negada (RLS). Verifique se você está logado e se executou o SQL de políticas RLS no Supabase.";
  }
  if (msg.includes("relation") && msg.includes("does not exist")) {
    return "Tabela não encontrada no banco. Verifique se o SQL das tabelas foi executado no Supabase.";
  }
  if (msg.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (msg.includes("JWT") || msg.includes("session")) {
    return "Sessão expirada. Faça login novamente.";
  }
  return msg;
}

function showScreen(screenId) {
  ["config-screen", "login-screen", "app-screen"].forEach((id) => {
    const el = $(id);
    if (el) el.classList.toggle("hidden", id !== screenId);
  });
}

async function ensureActiveUser() {
  if (!db) throw new Error("Cliente Supabase não inicializado.");
  const { data, error } = await db.auth.getUser();
  if (error || !data?.user) {
    throw new Error("Sessão expirada ou usuário não autenticado. Faça login novamente.");
  }
  user = data.user;
  return user;
}

/* =========================================================================
   CARREGAMENTO E SINCRONIZAÇÃO DAS CONFIGURAÇÕES NO SUPABASE
   ========================================================================= */

async function loadCustomSettings() {
  const activeUser = await ensureActiveUser();

  // 1. STATUS
  const { data: stData, error: stErr } = await db
    .from("custom_statuses")
    .select("*")
    .eq("user_id", activeUser.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (stErr) {
    console.warn("Aviso ao carregar custom_statuses:", stErr.message);
    customStatuses = DEFAULT_STATUSES.map((name, idx) => ({ id: null, name, position: idx }));
  } else if (!stData || stData.length === 0) {
    const seedRows = DEFAULT_STATUSES.map((name, idx) => ({
      user_id: activeUser.id,
      name,
      position: idx
    }));
    const { data: insertedSt } = await db.from("custom_statuses").insert(seedRows).select();
    customStatuses = insertedSt || seedRows;
  } else {
    customStatuses = stData;
  }

  // 2. EMPREENDIMENTOS
  const { data: devData, error: devErr } = await db
    .from("custom_developments")
    .select("*")
    .eq("user_id", activeUser.id)
    .order("created_at", { ascending: true });

  if (devErr) {
    console.warn("Aviso ao carregar custom_developments:", devErr.message);
    customDevelopments = DEFAULT_DEVELOPMENTS.map((d) => ({ id: null, ...d }));
  } else if (!devData || devData.length === 0) {
    const seedDevs = DEFAULT_DEVELOPMENTS.map((d) => ({
      user_id: activeUser.id,
      name: d.name,
      is_default: d.is_default
    }));
    const { data: insertedDevs } = await db.from("custom_developments").insert(seedDevs).select();
    customDevelopments = insertedDevs || seedDevs;
  } else {
    customDevelopments = devData;
  }

  // 3. MENSAGENS
  const { data: msgData, error: msgErr } = await db
    .from("custom_messages")
    .select("*")
    .eq("user_id", activeUser.id)
    .order("msg_number", { ascending: true })
    .order("created_at", { ascending: true });

  if (msgErr) {
    console.warn("Aviso ao carregar custom_messages:", msgErr.message);
    customMessages = DEFAULT_MESSAGES.map(([msg_number, title, content]) => ({
      id: null,
      msg_number,
      title,
      content
    }));
  } else if (!msgData || msgData.length === 0) {
    const seedMsgs = DEFAULT_MESSAGES.map(([msg_number, title, content]) => ({
      user_id: activeUser.id,
      msg_number,
      title,
      content
    }));
    const { data: insertedMsgs } = await db.from("custom_messages").insert(seedMsgs).select();
    customMessages = (insertedMsgs || seedMsgs).sort((a, b) => a.msg_number - b.msg_number);
  } else {
    customMessages = msgData;
  }

  syncAllDynamicSelects();
  renderSettingsView();
}

function syncAllDynamicSelects() {
  const statusNames = getStatusNames();
  const devNames = getDevelopmentNames();

  const fillSelect = (elId, items, firstOptionLabel = null) => {
    const el = $(elId);
    if (!el) return;
    const prev = el.value;
    el.innerHTML =
      (firstOptionLabel !== null ? `<option value="">${esc(firstOptionLabel)}</option>` : "") +
      items.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
    if (prev && items.includes(prev)) {
      el.value = prev;
    }
  };

  fillSelect("status-filter", statusNames, "Todos os status");
  fillSelect("bulk-status-select", statusNames, "Alterar status para...");
  fillSelect("lead-status", statusNames);

  fillSelect("development-filter", devNames, "Todos os empreendimentos");
  fillSelect("bulk-dev-select", devNames, "Alterar empreendimento...");
  fillSelect("lead-development", devNames);

  const navMsgLabel = $("nav-messages-label");
  if (navMsgLabel) {
    navMsgLabel.textContent = `Mensagens (${customMessages.length})`;
  }
}

/* =========================================================================
   SUGESTÃO INTELIGENTE DE EMPREENDIMENTO (ADICIONADA)
   ========================================================================= */

function checkDevelopmentSuggestions(leadsList, pinnedDevelopments) {
  const banner = $("development-suggestion-banner");
  const suggestionText = $("suggestion-text");
  const btnAccept = $("btn-accept-suggestion");
  const btnDismiss = $("btn-dismiss-suggestion");

  if (!banner || !suggestionText) return;

  const counts = {};
  leadsList.forEach(lead => {
    const dev = (lead.development || "").trim();
    if (dev && dev.toLowerCase() !== "outro") {
      counts[dev] = (counts[dev] || 0) + 1;
    }
  });

  const THRESHOLD = 10;
  let candidateToSuggest = null;

  for (const [devName, count] of Object.entries(counts)) {
    const isAlreadyPinned = pinnedDevelopments.some(p => p.toLowerCase() === devName.toLowerCase());
    if (count >= THRESHOLD && !isAlreadyPinned) {
      candidateToSuggest = { name: devName, count: count };
      break;
    }
  }

  if (candidateToSuggest) {
    suggestionText.innerHTML = `O empreendimento <strong>${candidateToSuggest.name}</strong> já possui <strong>${candidateToSuggest.count} leads</strong> cadastrados. Deseja transformá-lo em um empreendimento fixo?`;
    banner.classList.remove("hidden");

    if (btnAccept) {
      btnAccept.onclick = async () => {
        try {
          const activeUser = await ensureActiveUser();
          const { error } = await db.from("custom_developments").insert({
            user_id: activeUser.id,
            name: candidateToSuggest.name,
            is_default: false
          });
          if (error) throw error;

          banner.classList.add("hidden");
          toast(`Empreendimento "${candidateToSuggest.name}" fixado com sucesso!`);
          await loadCustomSettings();
        } catch (err) {
          toast("Erro ao fixar empreendimento: " + translateSupabaseError(err));
        }
      };
    }

    if (btnDismiss) {
      btnDismiss.onclick = () => {
        banner.classList.add("hidden");
      };
    }
  } else {
    banner.classList.add("hidden");
  }
}

/* =========================================================================
   HISTÓRICO E LEITURA DE LEADS
   ========================================================================= */

async function addHistory(leadId, action, details = "") {
  if (!db || !user?.id || !leadId) return;
  try {
    await db.from("lead_history").insert({
      lead_id: leadId,
      user_id: user.id,
      action: sanitizeText(action),
      details: sanitizeText(details)
    });
  } catch (e) {
    console.warn("Exceção ao registrar histórico:", e);
  }
}

async function addHistoryBatch(leadIds, action, details = "") {
  if (!db || !user?.id || !leadIds.length) return;
  try {
    const rows = leadIds.map((id) => ({
      lead_id: id,
      user_id: user.id,
      action: sanitizeText(action),
      details: sanitizeText(details)
    }));
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      await db.from("lead_history").insert(rows.slice(i, i + chunkSize));
    }
  } catch (e) {
    console.warn("Exceção ao registrar histórico em lote:", e);
  }
}

async function fetchAllUserLeadsFromDb() {
  const activeUser = await ensureActiveUser();
  const allRows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await db
      .from("leads")
      .select("*")
      .eq("user_id", activeUser.id)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

async function loadLeads(resetPagination = false) {
  if (!db) return;
  try {
    const allData = await fetchAllUserLeadsFromDb();
    leads = allData;

    const validIds = new Set(leads.map((l) => l.id));
    selectedLeadIds = new Set([...selectedLeadIds].filter((id) => validIds.has(id)));

    if (resetPagination) {
      visibleLeadsLimit = LEADS_PAGE_SIZE;
    }
    renderDashboard();
    renderLeads();

    // Dispara a verificação inteligente de novos empreendimentos
    checkDevelopmentSuggestions(leads, getDevelopmentNames());
  } catch (err) {
    toast("Erro ao carregar contatos: " + translateSupabaseError(err));
    console.error("Erro loadLeads:", err);
  }
}

function switchView(viewName) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  const target = $(`${viewName}-view`);
  if (target) target.classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  const titles = {
    dashboard: "Visão geral",
    leads: "Leads",
    messages: "Biblioteca de mensagens",
    settings: "Configurações do CRM",
    diagnostics: "Diagnóstico do banco"
  };
  $("page-title").textContent = titles[viewName] || "Abençoada CRM";

  if (viewName === "messages") renderMessages();
  if (viewName === "leads") renderLeads();
  if (viewName === "settings") renderSettingsView();
}

function switchSettingsTab(tabName) {
  document.querySelectorAll(".settings-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.stab === tabName);
  });
  document.querySelectorAll(".settings-pane").forEach((p) => {
    p.classList.toggle("hidden", p.id !== `stab-${tabName}`);
  });
}

function renderDashboard() {
  const active = leads.filter((x) => !x.archived);
  $("stat-total").textContent = active.length;
  $("stat-pending").textContent = active.filter((x) => x.status === "Pendente").length;
  $("stat-sent").textContent = active.filter((x) => x.status === "Mensagem enviada").length;
  $("stat-visits").textContent = active.filter((x) => x.status === "Visita marcada").length;

  const due = active
    .filter((x) => x.next_action_date)
    .sort((a, b) => a.next_action_date.localeCompare(b.next_action_date))
    .slice(0, 10);

  $("upcoming-list").innerHTML = due.length
    ? `<table>
        <thead>
          <tr>
            <th>Lead</th>
            <th>Empreendimento</th>
            <th>Status</th>
            <th>Data</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${due
            .map(
              (x) => `<tr>
                <td><b>${esc(x.name)}</b></td>
                <td>${esc(x.development)}</td>
                <td><span class="status ${slug(x.status)}">${esc(x.status)}</span></td>
                <td>${esc(formatDateBR(x.next_action_date))}</td>
                <td class="row-actions">
                  <button type="button" class="table-action wa-inline" data-wa="${esc(x.id)}">WhatsApp</button>
                  <button type="button" class="table-action" data-detail="${esc(x.id)}">Abrir</button>
                </td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>`
    : '<div class="empty">Nenhuma próxima ação agendada. Cadastre uma data de acompanhamento nos seus leads.</div>';
}

function formatDateBR(isoDate) {
  if (!isoDate) return "—";
  const parts = String(isoDate).split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/* =========================================================================
   MODO "MARCAR CONTATOS" E RENDERIZAÇÃO DA LISTA DE LEADS
   ========================================================================= */

function setSelectionMode(active) {
  selectionMode = Boolean(active);
  if (!selectionMode) {
    selectedLeadIds.clear();
  }
  const toggleBtn = $("toggle-selection-mode-btn");
  if (toggleBtn) {
    toggleBtn.textContent = selectionMode ? "✕ Cancelar marcação" : "☑ Marcar contatos";
  }
  renderLeads();
}

function updateBulkBar() {
  const bar = $("bulk-actions-bar");
  const showArchived = $("show-archived").checked;
  const count = selectedLeadIds.size;

  if (!selectionMode && count === 0) {
    bar.classList.add("hidden");
    return;
  }

  bar.classList.remove("hidden");
  $("bulk-selected-count").textContent = `${count} selecionado(s)`;

  const selectAllFilteredBtn = $("bulk-select-all-filtered");
  if (currentFilteredLeads.length > count) {
    selectAllFilteredBtn.classList.remove("hidden");
    selectAllFilteredBtn.textContent = `Selecionar todos os ${currentFilteredLeads.length} filtrados`;
  } else {
    selectAllFilteredBtn.classList.add("hidden");
  }

  $("bulk-archive-btn").classList.toggle("hidden", showArchived);
  $("bulk-restore-btn").classList.toggle("hidden", !showArchived);
}

function renderLeads() {
  const q = $("lead-search").value.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const statusFilter = $("status-filter").value;
  const devFilter = $("development-filter").value;
  const showArchived = $("show-archived").checked;

  const hasAnyFilter = Boolean(q || statusFilter || devFilter);
  $("clear-filters-btn").classList.toggle("hidden", !hasAnyFilter);

  const filtered = leads.filter((x) => {
    if (showArchived ? !x.archived : x.archived) return false;
    if (statusFilter && x.status !== statusFilter) return false;
    if (devFilter && x.development !== devFilter) return false;
    if (q) {
      const nameMatch = (x.name || "").toLowerCase().includes(q);
      const phoneMatch = (x.phone || "").toLowerCase().includes(q);
      const digitsMatch = qDigits.length >= 3 && phoneDigits(x.phone).includes(qDigits);
      if (!nameMatch && !phoneMatch && !digitsMatch) return false;
    }
    return true;
  });

  currentFilteredLeads = filtered;

  const filteredIdSet = new Set(filtered.map((x) => x.id));
  selectedLeadIds = new Set([...selectedLeadIds].filter((id) => filteredIdSet.has(id)));

  const totalActive = leads.filter((x) => !x.archived).length;
  const totalArch = leads.filter((x) => x.archived).length;
  const visibleSlice = filtered.slice(0, visibleLeadsLimit);

  const allVisibleSelected =
    visibleSlice.length > 0 && visibleSlice.every((item) => selectedLeadIds.has(item.id));

  $("leads-count-label").textContent =
    `Exibindo ${visibleSlice.length} de ${filtered.length} filtrado(s) • Total: ${totalActive} ativos e ${totalArch} arquivados`;

  const paginationBar = $("leads-pagination-bar");
  if (filtered.length > visibleLeadsLimit) {
    paginationBar.classList.remove("hidden");
    $("load-more-leads-btn").textContent = `Carregar mais (${filtered.length - visibleLeadsLimit} restantes)`;
  } else {
    paginationBar.classList.add("hidden");
  }

  updateBulkBar();

  $("leads-table").innerHTML = visibleSlice.length
    ? `<table>
        <thead>
          <tr>
            ${
              selectionMode
                ? `<th class="col-check">
                    <input type="checkbox" id="select-all-visible-checkbox" ${allVisibleSelected ? "checked" : ""} aria-label="Selecionar todos os visíveis">
                  </th>`
                : ""
            }
            <th>Nome</th>
            <th>Telefone</th>
            <th>Empreendimento</th>
            <th>Status</th>
            <th>Próxima ação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${visibleSlice
            .map((x) => {
              const isSelected = selectedLeadIds.has(x.id);
              return `<tr class="${isSelected ? "row-selected" : ""}">
                ${
                  selectionMode
                    ? `<td class="col-check">
                        <input type="checkbox" class="lead-row-checkbox" data-select-id="${esc(x.id)}" ${isSelected ? "checked" : ""} aria-label="Selecionar ${esc(x.name)}">
                      </td>`
                    : ""
                }
                <td>
                  <b>${esc(x.name)}</b>
                  ${x.archived ? '<span class="badge-archived">Arquivado</span>' : ""}
                </td>
                <td>${esc(x.phone)}</td>
                <td>${esc(x.development)}</td>
                <td><span class="status ${slug(x.status)}">${esc(x.status)}</span></td>
                <td>${esc(formatDateBR(x.next_action_date))}</td>
                <td class="row-actions">
                  <button type="button" class="table-action wa-inline" data-wa="${esc(x.id)}" title="Abrir direto no App WhatsApp">WhatsApp</button>
                  <button type="button" class="table-action" data-detail="${esc(x.id)}">Detalhes</button>
                  <button type="button" class="table-action del-inline" data-delete="${esc(x.id)}" title="Excluir permanentemente">Excluir</button>
                </td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>`
    : '<div class="empty">Nenhum lead encontrado com os filtros atuais.</div>';
}

/* =========================================================================
   BIBLIOTECA DE MENSAGENS
   ========================================================================= */

function renderMessages() {
  const q = $("message-search").value.trim().toLowerCase();
  const list = customMessages.filter(
    (m) =>
      !q ||
      String(m.msg_number).includes(q) ||
      m.title.toLowerCase().includes(q) ||
      m.content.toLowerCase().includes(q)
  );

  $("message-list").innerHTML =
    list
      .map(
        (m, idx) => `<article class="message-card">
          <span class="message-number">MENSAGEM ${String(m.msg_number).padStart(2, "0")}</span>
          <h3>${esc(m.title)}</h3>
          <p>${esc(m.content)}</p>
          <div class="message-actions">
            <span class="tiny">Variáveis: [NOME] e [EMPREENDIMENTO]</span>
            <button type="button" class="secondary" data-copy-idx="${idx}">Copiar texto</button>
          </div>
        </article>`
      )
      .join("") || '<div class="empty">Nenhuma mensagem encontrada.</div>';
}

/* =========================================================================
   ÁREA DE CONFIGURAÇÕES (STATUS, EMPREENDIMENTOS E MENSAGENS NO SUPABASE)
   ========================================================================= */

function renderSettingsView() {
  const stContainer = $("settings-statuses-list");
  if (stContainer) {
    stContainer.innerHTML = customStatuses.length
      ? customStatuses
          .map(
            (st, idx) => `<div class="settings-item">
              <div class="settings-item-info">
                <strong>${esc(st.name)}</strong>
                <span class="tiny">Posição #${idx + 1}</span>
              </div>
              <div class="settings-item-actions">
                <button type="button" class="table-action" data-edit-status="${esc(st.id || "")}" data-st-name="${esc(st.name)}">Renomear</button>
                <button type="button" class="table-action del-inline" data-del-status="${esc(st.id || "")}" data-st-name="${esc(st.name)}">Excluir</button>
              </div>
            </div>`
          )
          .join("")
      : '<div class="empty">Nenhum status cadastrado.</div>';
  }

  const devContainer = $("settings-devs-list");
  if (devContainer) {
    devContainer.innerHTML = customDevelopments.length
      ? customDevelopments
          .map(
            (dev) => `<div class="settings-item">
              <div class="settings-item-info">
                <div>
                  <strong>${esc(dev.name)}</strong>
                  ${dev.is_default ? '<span class="badge-default">Padrão para novos leads</span>' : ""}
                </div>
              </div>
              <div class="settings-item-actions">
                ${
                  !dev.is_default && dev.id
                    ? `<button type="button" class="table-action" data-default-dev="${esc(dev.id)}">Definir como padrão</button>`
                    : ""
                }
                <button type="button" class="table-action" data-edit-dev="${esc(dev.id || "")}" data-dev-name="${esc(dev.name)}">Renomear</button>
                <button type="button" class="table-action del-inline" data-del-dev="${esc(dev.id || "")}" data-dev-name="${esc(dev.name)}">Excluir</button>
              </div>
            </div>`
          )
          .join("")
      : '<div class="empty">Nenhum empreendimento cadastrado.</div>';
  }

  const msgContainer = $("settings-messages-list");
  if (msgContainer) {
    msgContainer.innerHTML = customMessages.length
      ? customMessages
          .map(
            (m) => `<div class="settings-item">
              <div class="settings-item-info">
                <strong>#${String(m.msg_number).padStart(2, "0")} — ${esc(m.title)}</strong>
                <span class="tiny">${esc(m.content)}</span>
              </div>
              <div class="settings-item-actions">
                <button type="button" class="table-action" data-edit-msg="${esc(m.id || "")}">Editar</button>
                <button type="button" class="table-action del-inline" data-del-msg="${esc(m.id || "")}" data-msg-title="${esc(m.title)}">Excluir</button>
              </div>
            </div>`
          )
          .join("")
      : '<div class="empty">Nenhuma mensagem cadastrada.</div>';
  }
}

async function handleAddStatus(e) {
  e.preventDefault();
  const name = sanitizeText($("new-status-name").value);
  if (!name) return;

  if (getStatusNames().some((s) => s.toLowerCase() === name.toLowerCase())) {
    toast("Já existe um status com esse nome.");
    return;
  }

  try {
    const activeUser = await ensureActiveUser();
    const { error } = await db.from("custom_statuses").insert({
      user_id: activeUser.id,
      name,
      position: customStatuses.length
    });
    if (error) throw error;

    $("new-status-name").value = "";
    toast(`Status "${name}" adicionado!`);
    await loadCustomSettings();
  } catch (err) {
    toast("Erro ao adicionar status: " + translateSupabaseError(err));
  }
}

async function handleAddDevelopment(e) {
  e.preventDefault();
  const name = sanitizeText($("new-dev-name").value);
  if (!name) return;

  if (getDevelopmentNames().some((d) => d.toLowerCase() === name.toLowerCase())) {
    toast("Já existe um empreendimento com esse nome.");
    return;
  }

  try {
    const activeUser = await ensureActiveUser();
    const { error } = await db.from("custom_developments").insert({
      user_id: activeUser.id,
      name,
      is_default: customDevelopments.length === 0
    });
    if (error) throw error;

    $("new-dev-name").value = "";
    toast(`Empreendimento "${name}" adicionado!`);
    await loadCustomSettings();
  } catch (err) {
    toast("Erro ao adicionar empreendimento: " + translateSupabaseError(err));
  }
}

function openMessageEditor(msgObj = null) {
  $("message-editor-form").reset();
  $("msg-editor-error").textContent = "";
  $("msg-edit-id").value = msgObj?.id || "";
  $("msg-editor-title").textContent = msgObj ? "Editar mensagem" : "Nova mensagem";

  const nextNum =
    customMessages.reduce((max, m) => Math.max(max, Number(m.msg_number) || 0), 0) + 1;

  $("msg-edit-number").value = msgObj?.msg_number || nextNum;
  $("msg-edit-title").value = msgObj?.title || "";
  $("msg-edit-content").value = msgObj?.content || "Olá, [NOME]! ";
  $("message-editor-dialog").showModal();
}

async function handleSaveMessageEditor(e) {
  e.preventDefault();
  const errEl = $("msg-editor-error");
  const btn = $("save-msg-editor-btn");
  errEl.textContent = "";

  const id = $("msg-edit-id").value.trim();
  const msgNumber = Number($("msg-edit-number").value) || 1;
  const title = sanitizeText($("msg-edit-title").value);
  const content = String($("msg-edit-content").value || "").trim();

  if (!title || !content) {
    errEl.textContent = "Preencha o título e o texto da mensagem.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Salvando...";

  try {
    const activeUser = await ensureActiveUser();
    const payload = {
      user_id: activeUser.id,
      msg_number: msgNumber,
      title,
      content
    };

    let res;
    if (id) {
      res = await db
        .from("custom_messages")
        .update(payload)
        .eq("id", id)
        .eq("user_id", activeUser.id);
    } else {
      res = await db.from("custom_messages").insert(payload);
    }

    if (res.error) throw res.error;

    $("message-editor-dialog").close();
    toast(id ? "Mensagem atualizada!" : "Nova mensagem salva!");
    await loadCustomSettings();
    renderMessages();
  } catch (err) {
    errEl.textContent = "Erro ao salvar: " + translateSupabaseError(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Salvar mensagem";
  }
}

/* =========================================================================
   CADASTRO E EDIÇÃO DE LEAD
   ========================================================================= */

function openLeadForm(lead = null) {
  syncAllDynamicSelects();
  const formEl = $("lead-form");
  formEl.reset();
  $("lead-error").textContent = "";
  $("lead-id").value = lead?.id || "";
  $("dialog-title").textContent = lead ? "Editar lead" : "Novo lead";
  $("lead-name").value = lead?.name || "";
  $("lead-phone").value = lead?.phone || "";

  const devSelect = $("lead-development");
  const targetDev = lead?.development || getDefaultDevelopmentName();
  if (targetDev && ![...devSelect.options].some((o) => o.value === targetDev)) {
    devSelect.insertAdjacentHTML("beforeend", `<option value="${esc(targetDev)}">${esc(targetDev)}</option>`);
  }
  devSelect.value = targetDev;

  const statusSelect = $("lead-status");
  const targetStatus = lead?.status || getStatusNames()[0] || "Pendente";
  if (targetStatus && ![...statusSelect.options].some((o) => o.value === targetStatus)) {
    statusSelect.insertAdjacentHTML("beforeend", `<option value="${esc(targetStatus)}">${esc(targetStatus)}</option>`);
  }
  statusSelect.value = targetStatus;

  $("lead-modality").value = lead?.preferred_modality || "";
  $("lead-next-date").value = lead?.next_action_date || "";
  $("lead-notes").value = lead?.notes || "";
  $("save-lead-btn").disabled = false;
  $("save-lead-btn").textContent = "Salvar lead";
  $("lead-dialog").showModal();
}

async function saveLead(e) {
  e.preventDefault();
  const errEl = $("lead-error");
  const btn = $("save-lead-btn");
  errEl.textContent = "";

  const id = $("lead-id").value.trim();
  const name = sanitizeText($("lead-name").value);
  const rawPhone = sanitizeText($("lead-phone").value);

  if (!name || !rawPhone) {
    errEl.textContent = "Preencha os campos obrigatórios: Nome do cliente e Telefone com DDD.";
    return;
  }

  const digits = phoneDigits(rawPhone);
  if (digits.length < 8) {
    errEl.textContent = "Informe um telefone válido com DDD.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Verificando...";

  try {
    const activeUser = await ensureActiveUser();
    const latestLeads = await fetchAllUserLeadsFromDb();
    leads = latestLeads;

    const duplicate = latestLeads.find(
      (item) => item.id !== id && phoneDigits(item.phone) === digits
    );

    if (duplicate) {
      const stateLabel = duplicate.archived ? "arquivado" : "ativo";
      errEl.textContent = `Já existe um contato ${stateLabel} com este telefone: "${duplicate.name}" (${duplicate.phone}).`;
      return;
    }

    btn.textContent = "Salvando...";

    const payload = {
      user_id: activeUser.id,
      name,
      phone: normalizePhoneForStorage(rawPhone),
      development: $("lead-development").value || getDefaultDevelopmentName(),
      status: $("lead-status").value || getStatusNames()[0] || "Pendente",
      preferred_modality: $("lead-modality").value || null,
      next_action_date: $("lead-next-date").value || null,
      notes: sanitizeText($("lead-notes").value) || null
    };

    let result;
    if (id) {
      result = await db
        .from("leads")
        .update(payload)
        .eq("id", id)
        .eq("user_id", activeUser.id)
        .select()
        .single();
    } else {
      result = await db
        .from("leads")
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      errEl.textContent = "Erro ao salvar no Supabase: " + translateSupabaseError(result.error);
      return;
    }

    await addHistory(
      result.data.id,
      id ? "Lead atualizado" : "Lead cadastrado",
      `Status: ${payload.status} | Empreendimento: ${payload.development}`
    );

    $("lead-dialog").close();
    toast(id ? "Alterações salvas com sucesso!" : "Lead cadastrado e salvo no Supabase!");
    await loadLeads();
  } catch (err) {
    errEl.textContent = "Falha inesperada: " + translateSupabaseError(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Salvar lead";
  }
}

/* =========================================================================
   EXCLUSÃO E AÇÕES EM LOTE
   ========================================================================= */

function openDeleteConfirm(leadIds) {
  const ids = Array.isArray(leadIds) ? leadIds : [leadIds];
  const targets = leads.filter((x) => ids.includes(x.id));
  if (!targets.length) return;

  leadsPendingDeletion = targets;
  $("delete-error").textContent = "";

  if (targets.length === 1) {
    const lead = targets[0];
    $("delete-dialog-title").textContent = "Excluir contato permanentemente?";
    $("delete-dialog-desc").innerHTML =
      "Você está prestes a excluir definitivamente o contato abaixo e <b>todo o seu histórico de atividades</b>. Esta ação não pode ser desfeita.";
    $("delete-confirm-summary").innerHTML = `
      <div><strong>Nome:</strong> ${esc(lead.name)}</div>
      <div><strong>Telefone:</strong> ${esc(lead.phone)}</div>
      <div><strong>Empreendimento:</strong> ${esc(lead.development)}</div>
      <div><strong>Situação atual:</strong> ${lead.archived ? "Arquivado" : "Ativo"} (${esc(lead.status)})</div>
    `;
  } else {
    $("delete-dialog-title").textContent = `Excluir ${targets.length} contatos permanentemente?`;
    $("delete-dialog-desc").innerHTML =
      `Você está prestes a excluir definitivamente <b>${targets.length} contatos selecionados</b> e <b>todo o histórico associado a eles</b>. Esta ação não pode ser desfeita.`;
    $("delete-confirm-summary").innerHTML = `
      <div><strong>Contatos selecionados (${targets.length}):</strong></div>
      <ul>
        ${targets
          .slice(0, 30)
          .map((l) => `<li>${esc(l.name)} — ${esc(l.phone)} (${l.archived ? "Arquivado" : "Ativo"})</li>`)
          .join("")}
        ${targets.length > 30 ? `<li><i>... e mais ${targets.length - 30} contato(s).</i></li>` : ""}
      </ul>
    `;
  }

  const btn = $("confirm-delete-btn");
  btn.disabled = false;
  btn.textContent =
    targets.length === 1
      ? "Sim, excluir definitivamente"
      : `Sim, excluir ${targets.length} contatos`;
  $("delete-confirm-dialog").showModal();
}

async function executePermanentDelete() {
  const errEl = $("delete-error");
  const btn = $("confirm-delete-btn");
  errEl.textContent = "";

  if (!leadsPendingDeletion.length) return;

  const targets = [...leadsPendingDeletion];
  const targetIds = targets.map((t) => t.id);
  btn.disabled = true;
  btn.textContent = "Excluindo...";

  try {
    const activeUser = await ensureActiveUser();
    const chunkSize = 100;
    let totalDeleted = 0;

    for (let i = 0; i < targetIds.length; i += chunkSize) {
      const sliceIds = targetIds.slice(i, i + chunkSize);

      const { error: histErr } = await db
        .from("lead_history")
        .delete()
        .in("lead_id", sliceIds)
        .eq("user_id", activeUser.id);
      if (histErr) throw histErr;

      const { data: deletedRows, error: delErr } = await db
        .from("leads")
        .delete()
        .in("id", sliceIds)
        .eq("user_id", activeUser.id)
        .select("id");
      if (delErr) throw delErr;

      totalDeleted += deletedRows?.length || 0;
    }

    $("delete-confirm-dialog").close();
    const detailDlg = $("detail-dialog");
    if (detailDlg && detailDlg.open) detailDlg.close();

    for (const id of targetIds) selectedLeadIds.delete(id);
    leadsPendingDeletion = [];
    selectedLead = null;

    toast(
      totalDeleted === 1
        ? `Contato "${targets[0].name}" excluído permanentemente.`
        : `${totalDeleted} contatos excluídos permanentemente.`
    );
    await loadLeads();
  } catch (err) {
    errEl.textContent = "Erro ao excluir: " + translateSupabaseError(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Sim, excluir definitivamente";
  }
}

async function executeBulkArchiveToggle(nextArchived) {
  const ids = [...selectedLeadIds];
  if (!ids.length) return;

  const btn = nextArchived ? $("bulk-archive-btn") : $("bulk-restore-btn");
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = nextArchived ? "Arquivando..." : "Restaurando...";

  try {
    const activeUser = await ensureActiveUser();
    const chunkSize = 100;
    let updatedCount = 0;

    for (let i = 0; i < ids.length; i += chunkSize) {
      const slice = ids.slice(i, i + chunkSize);
      const { data, error } = await db
        .from("leads")
        .update({ archived: nextArchived })
        .in("id", slice)
        .eq("user_id", activeUser.id)
        .select("id");
      if (error) throw error;
      updatedCount += data?.length || 0;
    }

    await addHistoryBatch(ids, nextArchived ? "Lead arquivado em lote" : "Lead restaurado em lote");
    selectedLeadIds.clear();
    toast(
      nextArchived
        ? `${updatedCount} contato(s) arquivado(s).`
        : `${updatedCount} contato(s) restaurado(s) para ativos.`
    );
    await loadLeads();
  } catch (err) {
    toast("Erro na operação em lote: " + translateSupabaseError(err));
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function executeBulkStatusUpdate() {
  const ids = [...selectedLeadIds];
  const nextStatus = $("bulk-status-select").value;
  if (!ids.length) {
    toast("Selecione ao menos um contato.");
    return;
  }
  if (!nextStatus) {
    toast("Escolha um status antes de aplicar.");
    return;
  }

  const btn = $("bulk-apply-status-btn");
  btn.disabled = true;
  btn.textContent = "Aplicando...";

  try {
    const activeUser = await ensureActiveUser();
    const chunkSize = 100;
    let updatedCount = 0;

    const updatePayload = { status: nextStatus };
    if (nextStatus === "Mensagem enviada") {
      updatePayload.last_contacted_at = new Date().toISOString();
    }

    for (let i = 0; i < ids.length; i += chunkSize) {
      const slice = ids.slice(i, i + chunkSize);
      const { data, error } = await db
        .from("leads")
        .update(updatePayload)
        .in("id", slice)
        .eq("user_id", activeUser.id)
        .select("id");
      if (error) throw error;
      updatedCount += data?.length || 0;
    }

    await addHistoryBatch(ids, "Status alterado em lote", `Novo status: ${nextStatus}`);
    $("bulk-status-select").value = "";
    selectedLeadIds.clear();
    toast(`Status "${nextStatus}" aplicado a ${updatedCount} contato(s).`);
    await loadLeads();
  } catch (err) {
    toast("Erro ao atualizar status em lote: " + translateSupabaseError(err));
  } finally {
    btn.disabled = false;
    btn.textContent = "Aplicar status";
  }
}

async function executeBulkDevelopmentUpdate() {
  const ids = [...selectedLeadIds];
  const nextDev = $("bulk-dev-select").value;
  if (!ids.length) {
    toast("Selecione ao menos um contato.");
    return;
  }
  if (!nextDev) {
    toast("Escolha um empreendimento antes de aplicar.");
    return;
  }

  const btn = $("bulk-apply-dev-btn");
  btn.disabled = true;
  btn.textContent = "Aplicando...";

  try {
    const activeUser = await ensureActiveUser();
    const chunkSize = 100;
    let updatedCount = 0;

    for (let i = 0; i < ids.length; i += chunkSize) {
      const slice = ids.slice(i, i + chunkSize);
      const { data, error } = await db
        .from("leads")
        .update({ development: nextDev })
        .in("id", slice)
        .eq("user_id", activeUser.id)
        .select("id");
      if (error) throw error;
      updatedCount += data?.length || 0;
    }

    await addHistoryBatch(ids, "Empreendimento alterado em lote", `Novo empreendimento: ${nextDev}`);
    $("bulk-dev-select").value = "";
    selectedLeadIds.clear();
    toast(`Empreendimento "${nextDev}" aplicado a ${updatedCount} contato(s).`);
    await loadLeads();
  } catch (err) {
    toast("Erro ao atualizar empreendimento em lote: " + translateSupabaseError(err));
  } finally {
    btn.disabled = false;
    btn.textContent = "Aplicar empreend.";
  }
}

/* =========================================================================
   FICHA DE DETALHES DO LEAD
   ========================================================================= */

async function openLeadDetails(id) {
  selectedLead = leads.find((x) => x.id === id);
  if (!selectedLead) return;
  const l = selectedLead;

  $("detail-name").textContent = l.name;
  $("detail-content").innerHTML = [
    ["Telefone", l.phone],
    ["Empreendimento", l.development],
    ["Status", l.status],
    ["Preferência", l.preferred_modality || "Não definida"],
    ["Próxima ação", formatDateBR(l.next_action_date)],
    ["Último contato", l.last_contacted_at ? new Date(l.last_contacted_at).toLocaleString("pt-BR") : "Ainda não registrado"],
    ["Observações", l.notes || "—"],
    ["Situação", l.archived ? "Arquivado" : "Ativo"]
  ]
    .map(([k, v]) => `<div class="detail-line"><strong>${k}</strong><span>${esc(v)}</span></div>`)
    .join("");

  const msgSelect = $("detail-msg-select");
  msgSelect.innerHTML = customMessages.map(
    (m, idx) => `<option value="${idx}">${String(m.msg_number).padStart(2, "0")} — ${esc(m.title)}</option>`
  ).join("");

  const updatePreview = () => {
    const idx = Number(msgSelect.value) || 0;
    const raw = customMessages[idx]?.content || DEFAULT_MESSAGES[0][2];
    $("detail-msg-preview").textContent = adaptMessageForLead(raw, l);
  };
  msgSelect.onchange = updatePreview;
  updatePreview();

  $("detail-whatsapp").textContent = "Abrir App WhatsApp";
  $("detail-whatsapp").onclick = () => {
    const idx = Number(msgSelect.value) || 0;
    openWhatsAppForLead(l, idx);
  };

  $("detail-sent").onclick = async () => {
    try {
      const activeUser = await ensureActiveUser();
      const sentStatus = getStatusNames().find((s) => /mensagem enviada/i.test(s)) || "Mensagem enviada";
      const { error } = await db
        .from("leads")
        .update({
          status: sentStatus,
          last_contacted_at: new Date().toISOString()
        })
        .eq("id", l.id)
        .eq("user_id", activeUser.id);

      if (error) {
        toast("Erro ao atualizar status: " + translateSupabaseError(error));
        return;
      }

      await addHistory(l.id, "Mensagem marcada como enviada", "Confirmação manual após envio no WhatsApp.");
      $("detail-dialog").close();
      toast(`Status atualizado para ${sentStatus}.`);
      await loadLeads();
    } catch (err) {
      toast("Erro inesperado ao atualizar status: " + translateSupabaseError(err));
    }
  };

  $("detail-edit").onclick = () => {
    $("detail-dialog").close();
    openLeadForm(l);
  };

  $("detail-archive").textContent = l.archived ? "Restaurar lead" : "Arquivar lead";
  $("detail-archive").onclick = async () => {
    const nextArchived = !l.archived;
    try {
      const activeUser = await ensureActiveUser();
      const { error } = await db
        .from("leads")
        .update({ archived: nextArchived })
        .eq("id", l.id)
        .eq("user_id", activeUser.id);

      if (error) {
        toast("Erro ao atualizar arquivamento: " + translateSupabaseError(error));
        return;
      }

      await addHistory(l.id, nextArchived ? "Lead arquivado" : "Lead restaurado");
      $("detail-dialog").close();
      toast(nextArchived ? "Lead arquivado." : "Lead restaurado para ativos.");
      await loadLeads();
    } catch (err) {
      toast("Erro inesperado ao arquivar/restaurar: " + translateSupabaseError(err));
    }
  };

  $("detail-delete").onclick = () => openDeleteConfirm([l.id]);

  $("detail-history").innerHTML = '<p class="tiny">Carregando histórico...</p>';
  $("detail-dialog").showModal();

  try {
    const activeUser = await ensureActiveUser();
    const h = await db
      .from("lead_history")
      .select("*")
      .eq("lead_id", id)
      .eq("user_id", activeUser.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (h.error) {
      $("detail-history").innerHTML = `<p class="tiny">Histórico indisponível: ${esc(translateSupabaseError(h.error))}</p>`;
    } else if (!h.data || h.data.length === 0) {
      $("detail-history").innerHTML = '<p class="tiny">Ainda não há registros de histórico para este lead.</p>';
    } else {
      $("detail-history").innerHTML = h.data
        .map(
          (x) => `<div class="history-item">
            <b>${esc(x.action)}</b> — ${new Date(x.created_at).toLocaleString("pt-BR")}
            ${x.details ? `<br><span>${esc(x.details)}</span>` : ""}
          </div>`
        )
        .join("");
    }
  } catch {
    $("detail-history").innerHTML = '<p class="tiny">Erro ao carregar histórico.</p>';
  }
}

/* =========================================================================
   DIAGNÓSTICO E IMPORTAÇÃO EM MASSA
   ========================================================================= */

async function runDatabaseDiagnostics() {
  const box = $("diagnostics-results");
  const btn = $("run-diagnostics-btn");
  btn.disabled = true;
  btn.textContent = "Testando...";

  const checks = [];
  const pushCheck = (title, ok, detail) => {
    checks.push({ title, ok, detail });
    box.innerHTML = checks
      .map(
        (c) => `<div class="diag-item ${c.ok ? "ok" : "fail"}">
          <strong>${c.ok ? "✔" : "✖"} ${esc(c.title)}</strong>
          <p>${esc(c.detail)}</p>
        </div>`
      )
      .join("");
  };

  try {
    if (!db) {
      pushCheck("1. Cliente Supabase", false, "Cliente não inicializado.");
      return;
    }
    pushCheck("1. Cliente Supabase", true, "Instância conectada à URL configurada.");

    const activeUser = await ensureActiveUser();
    pushCheck("2. Autenticação e Sessão", true, `Autenticado como ${activeUser.email}.`);

    const allLeads = await fetchAllUserLeadsFromDb();
    const activeCount = allLeads.filter((l) => !l.archived).length;
    const archCount = allLeads.filter((l) => l.archived).length;
    pushCheck(
      "3. Tabela leads",
      true,
      `Total no banco: ${allLeads.length} contatos (${activeCount} ativos, ${archCount} arquivados).`
    );

    pushCheck(
      "4. Tabelas de personalização",
      true,
      `${customStatuses.length} status, ${customDevelopments.length} empreendimentos e ${customMessages.length} mensagens sincronizadas no Supabase.`
    );
  } catch (err) {
    pushCheck("Erro inesperado", false, translateSupabaseError(err));
  } finally {
    btn.disabled = false;
    btn.textContent = "Executar verificação completa";
  }
}

async function openImportDialog() {
  $("import-file-input").value = "";
  $("import-sheet-row").classList.add("hidden");
  $("import-mapping-box").classList.add("hidden");
  $("import-progress-box").classList.add("hidden");
  $("import-report-box").classList.add("hidden");
  $("confirm-import-btn").classList.add("hidden");
  $("import-error").textContent = "";
  currentWorkbook = null;
  parsedImportRows = [];
  $("import-dialog").showModal();

  try {
    leads = await fetchAllUserLeadsFromDb();
  } catch (err) {
    $("import-error").textContent = "Aviso ao sincronizar contatos existentes: " + translateSupabaseError(err);
  }
}

function handleFileUpload(e) {
  const file = e.target.files?.[0];
  $("import-error").textContent = "";
  $("import-report-box").classList.add("hidden");
  $("import-progress-box").classList.add("hidden");
  if (!file) return;

  if (typeof window.XLSX === "undefined") {
    $("import-error").textContent = "Biblioteca de leitura de planilhas ainda carregando. Aguarde 2 segundos e tente novamente.";
    return;
  }

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      currentWorkbook = window.XLSX.read(data, { type: "array" });
      const sheetNames = currentWorkbook.SheetNames || [];

      if (!sheetNames.length) {
        $("import-error").textContent = "Nenhuma aba encontrada no arquivo.";
        return;
      }

      try {
        leads = await fetchAllUserLeadsFromDb();
      } catch {}

      const sheetSelect = $("import-sheet-select");
      sheetSelect.innerHTML = sheetNames
        .map((s) => `<option value="${esc(s)}">${esc(s)}</option>`)
        .join("");

      if (sheetNames.includes("Todos os contatos")) {
        sheetSelect.value = "Todos os contatos";
      }

      $("import-sheet-row").classList.toggle("hidden", sheetNames.length <= 1);
      sheetSelect.onchange = () => parseSelectedSheet(sheetSelect.value);
      parseSelectedSheet(sheetSelect.value);
    } catch (err) {
      $("import-error").textContent = "Erro ao ler o arquivo: " + translateSupabaseError(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

function parseSelectedSheet(sheetName) {
  $("import-error").textContent = "";
  const ws = currentWorkbook.Sheets[sheetName];
  const rows = window.XLSX.utils.sheet_to_json(ws, { defval: "" });

  if (!rows.length) {
    $("import-mapping-box").classList.add("hidden");
    $("confirm-import-btn").classList.add("hidden");
    $("import-error").textContent = `A aba "${sheetName}" não contém linhas de dados.`;
    return;
  }

  parsedImportRows = rows;
  const headers = Object.keys(rows[0]);
  const optionsHtml =
    `<option value="">— Não mapear —</option>` +
    headers.map((h) => `<option value="${esc(h)}">${esc(h)}</option>`).join("");

  ["map-name", "map-phone", "map-dev", "map-prev-status", "map-status", "map-notes"].forEach((id) => {
    $(id).innerHTML = optionsHtml;
    $(id).onchange = updateImportPreview;
  });

  const findCol = (patterns) =>
    headers.find((h) => patterns.some((p) => h.toLowerCase().includes(p))) || "";

  $("map-name").value = findCol(["nome", "cliente", "lead", "name"]);
  $("map-phone").value = findCol(["telefone", "celular", "whatsapp", "fone", "phone"]);
  $("map-dev").value = findCol(["lista", "empreendimento", "produto", "development"]);
  $("map-prev-status").value = findCol(["status no app", "situação", "situacao", "origem"]);
  $("map-status").value = findCol(["acompanhamento", "status", "etapa"]);
  $("map-notes").value = findCol(["observa", "nota", "detalhe", "notes"]);

  $("import-mapping-box").classList.remove("hidden");
  $("confirm-import-btn").classList.remove("hidden");
  updateImportPreview();
}

function buildPreparedImportList(currentDbLeads) {
  const colName = $("map-name").value;
  const colPhone = $("map-phone").value;
  const colDev = $("map-dev").value;
  const colPrev = $("map-prev-status").value;
  const colStatus = $("map-status").value;
  const colNotes = $("map-notes").value;
  const archiveDiscarded = $("import-archive-discarded").checked;

  const validStatuses = getStatusNames();
  const validDevs = getDevelopmentNames();
  const defaultDev = getDefaultDevelopmentName();

  const existingMap = new Map();
  for (const item of currentDbLeads) {
    const d = phoneDigits(item.phone);
    if (d && !existingMap.has(d)) {
      existingMap.set(d, item);
    }
  }

  const seenInSheet = new Map();

  return parsedImportRows.map((row, index) => {
    const rowNum = index + 2;
    const name = sanitizeText(row[colName]);
    const rawPhone = sanitizeText(row[colPhone]);
    const digits = phoneDigits(rawPhone);
    const formattedPhone = normalizePhoneForStorage(rawPhone);

    const rawDev = sanitizeText(row[colDev]);
    const matchedDev = validDevs.find((d) => d.toLowerCase() === rawDev.toLowerCase());
    let development = matchedDev || defaultDev;
    if (!matchedDev) {
      if (/barueri/i.test(rawDev) && validDevs.includes("Dom Barueri")) development = "Dom Barueri";
      else if (/parque/i.test(rawDev) && validDevs.includes("Dom Parque")) development = "Dom Parque";
      else if (rawDev && validDevs.includes("Outro")) development = "Outro";
    }

    const rawStatus = sanitizeText(row[colStatus]);
    const status = validStatuses.includes(rawStatus) ? rawStatus : (validStatuses[0] || "Pendente");

    const prevStatus = sanitizeText(row[colPrev]);
    const rawNotes = sanitizeText(row[colNotes]);

    const noteParts = [];
    if (prevStatus) noteParts.push(`Situação anterior no app: ${prevStatus}`);
    if (rawDev && !validDevs.includes(rawDev)) noteParts.push(`Lista original: ${rawDev}`);
    if (rawNotes) noteParts.push(rawNotes);
    const notes = noteParts.length ? sanitizeText(noteParts.join(" | ")) : null;

    const archived = Boolean(archiveDiscarded && /^descartado$/i.test(prevStatus));

    let category = "valid";
    let skipReason = "";

    if (!name && !digits) {
      category = "invalid";
      skipReason = "Linha vazia (sem nome e sem telefone)";
    } else if (!name) {
      category = "invalid";
      skipReason = "Nome ausente";
    } else if (!digits || digits.length < 8) {
      category = "invalid";
      skipReason = "Telefone ausente ou inválido";
    } else if (existingMap.has(digits)) {
      const existing = existingMap.get(digits);
      category = "duplicate_db";
      skipReason = existing.archived
        ? `Já existe no banco (Arquivado: ${existing.name})`
        : `Já existe no banco (Ativo: ${existing.name})`;
    } else if (seenInSheet.has(digits)) {
      const firstRow = seenInSheet.get(digits);
      category = "duplicate_sheet";
      skipReason = `Duplicado na planilha (mesmo telefone da linha ${firstRow})`;
    }

    if (category === "valid") {
      seenInSheet.set(digits, rowNum);
    }

    return {
      rowNum,
      name,
      phone: formattedPhone,
      digits,
      development,
      status,
      prevStatus,
      notes,
      archived,
      category,
      skipReason
    };
  });
}

function updateImportPreview() {
  const colName = $("map-name").value;
  const colPhone = $("map-phone").value;
  if (!colName || !colPhone) {
    $("import-preview-stats").innerHTML = '<p class="error">Selecione ao menos as colunas de Nome e Telefone.</p>';
    $("import-preview-table").innerHTML = "";
    $("confirm-import-btn").disabled = true;
    return;
  }

  const list = buildPreparedImportList(leads);
  const validRows = list.filter((x) => x.category === "valid");
  const dupDbRows = list.filter((x) => x.category === "duplicate_db");
  const dupSheetRows = list.filter((x) => x.category === "duplicate_sheet");
  const invalidRows = list.filter((x) => x.category === "invalid");
  const archivedTargetRows = validRows.filter((x) => x.archived);

  $("confirm-import-btn").disabled = validRows.length === 0;
  $("confirm-import-btn").textContent = `Importar ${validRows.length} contato(s) válido(s)`;

  $("import-preview-stats").innerHTML = `
    <span class="pill neutral">Identificados na planilha: <b>${list.length}</b></span>
    <span class="pill ok">Válidos para importar: <b>${validRows.length}</b></span>
    <span class="pill warn">Já no banco (ativos/arquivados): <b>${dupDbRows.length}</b></span>
    <span class="pill warn">Duplicados na planilha: <b>${dupSheetRows.length}</b></span>
    <span class="pill danger">Ignorados (inválidos): <b>${invalidRows.length}</b></span>
    ${archivedTargetRows.length ? `<span class="pill info">Irão para Arquivados: <b>${archivedTargetRows.length}</b></span>` : ""}
  `;

  $("import-preview-table").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Linha</th>
          <th>Nome</th>
          <th>Telefone normalizado</th>
          <th>Empreendimento</th>
          <th>Destino</th>
          <th>Status da análise</th>
        </tr>
      </thead>
      <tbody>
        ${list
          .slice(0, 25)
          .map(
            (item) => `<tr class="${item.category !== "valid" ? "row-muted" : ""}">
              <td>${item.rowNum}</td>
              <td>${esc(item.name || "—")}</td>
              <td>${esc(item.phone || "—")}</td>
              <td>${esc(item.development)}</td>
              <td>${item.archived ? "Arquivados" : "Ativos"}</td>
              <td>${
                item.category !== "valid"
                  ? `<span class="tag-skip">${esc(item.skipReason)}</span>`
                  : `<span class="tag-ok">Pronto para importar</span>`
              }</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>
    ${list.length > 25 ? `<p class="tiny" style="margin-top:.5rem">Prévia visual limitada às primeiras 25 linhas. <b>Todos os ${validRows.length} contatos válidos</b> serão processados na importação.</p>` : ""}
  `;
}

async function executeBatchImport() {
  const btn = $("confirm-import-btn");
  const errEl = $("import-error");
  const progressEl = $("import-progress-box");
  const reportEl = $("import-report-box");
  errEl.textContent = "";

  btn.disabled = true;
  btn.textContent = "Verificando sessão...";
  progressEl.classList.remove("hidden");
  progressEl.textContent = "Validando sessão e sincronizando registros existentes no Supabase...";

  try {
    const activeUser = await ensureActiveUser();
    const freshLeads = await fetchAllUserLeadsFromDb();
    leads = freshLeads;

    const list = buildPreparedImportList(freshLeads);
    const toInsert = list.filter((x) => x.category === "valid");
    const dupDbRows = list.filter((x) => x.category === "duplicate_db");
    const dupSheetRows = list.filter((x) => x.category === "duplicate_sheet");
    const invalidRows = list.filter((x) => x.category === "invalid");

    if (!toInsert.length) {
      progressEl.classList.add("hidden");
      errEl.textContent = "Nenhum contato novo e válido para importar após verificar o banco de dados.";
      updateImportPreview();
      return;
    }

    const chunkSize = 25;
    const totalChunks = Math.ceil(toInsert.length / chunkSize);
    const insertedAll = [];
    const failedRows = [];

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const slice = toInsert.slice(start, start + chunkSize);

      progressEl.textContent = `Gravando lote ${chunkIndex + 1} de ${totalChunks} (${insertedAll.length} de ${toInsert.length} contatos salvos)...`;
      btn.textContent = `Importando lote ${chunkIndex + 1}/${totalChunks}...`;

      const payload = slice.map((x) => ({
        user_id: activeUser.id,
        name: x.name,
        phone: x.phone,
        development: x.development,
        status: x.status,
        notes: x.notes,
        archived: x.archived
      }));

      const { data, error } = await db
        .from("leads")
        .insert(payload)
        .select("id, name, development, archived");

      if (!error && data && data.length > 0) {
        insertedAll.push(...data);
        const historyRows = data.map((item) => ({
          lead_id: item.id,
          user_id: activeUser.id,
          action: "Lead importado em lote",
          details: `Importação via planilha (${item.development}${item.archived ? " - Arquivado" : ""})`
        }));
        await db.from("lead_history").insert(historyRows);
      } else {
        for (const item of slice) {
          const singleRes = await db
            .from("leads")
            .insert({
              user_id: activeUser.id,
              name: item.name,
              phone: item.phone,
              development: item.development,
              status: item.status,
              notes: item.notes,
              archived: item.archived
            })
            .select("id, name, development, archived")
            .single();

          if (!singleRes.error && singleRes.data) {
            insertedAll.push(singleRes.data);
            await db.from("lead_history").insert({
              lead_id: singleRes.data.id,
              user_id: activeUser.id,
              action: "Lead importado em lote",
              details: `Importação via planilha (${singleRes.data.development}${singleRes.data.archived ? " - Arquivado" : ""})`
            });
          } else {
            failedRows.push({
              rowNum: item.rowNum,
              name: item.name,
              phone: item.phone,
              reason: translateSupabaseError(singleRes.error || error)
            });
          }
        }
      }
    }

    await loadLeads(true);

    progressEl.classList.add("hidden");
    $("import-mapping-box").classList.add("hidden");
    $("confirm-import-btn").classList.add("hidden");

    const importedActiveCount = insertedAll.filter((x) => !x.archived).length;
    const importedArchivedCount = insertedAll.filter((x) => x.archived).length;
    const hasRowErrors = failedRows.length > 0;

    reportEl.className = hasRowErrors ? "import-report partial-warn" : "import-report";
    reportEl.classList.remove("hidden");

    reportEl.innerHTML = `
      <h3>${hasRowErrors ? "⚠️ Importação Concluída com Alertas" : "✔ Relatório Final de Importação"}</h3>
      <ul>
        <li><b>Total de linhas identificadas na planilha:</b> ${list.length}</li>
        <li><b>Contatos válidos aptos para importar:</b> ${toInsert.length}</li>
        <li><b>Contatos gravados com sucesso no Supabase:</b> ${insertedAll.length} (${importedActiveCount} ativos e ${importedArchivedCount} arquivados)</li>
        <li><b>Duplicados já existentes no banco:</b> ${dupDbRows.length}</li>
        <li><b>Duplicados dentro da planilha:</b> ${dupSheetRows.length}</li>
        <li><b>Ignorados por dados inválidos:</b> ${invalidRows.length}</li>
      </ul>
    `;

    if (insertedAll.length > 0) {
      toast(`${insertedAll.length} contato(s) salvos no banco de dados.`);
    }
  } catch (err) {
    progressEl.classList.add("hidden");
    errEl.textContent = "Falha durante a importação: " + translateSupabaseError(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Confirmar e importar contatos";
  }
}

/* =========================================================================
   CONEXÃO E EVENTOS
   ========================================================================= */

async function connectSupabase(url, key) {
  const cleanUrl = String(url || "").trim().replace(/\/+$/, "");
  const cleanKey = String(key || "").trim();

  if (!cleanUrl || !cleanKey) {
    throw new Error("Informe a URL do projeto e a chave publicável.");
  }
  if (!cleanUrl.startsWith("https://")) {
    throw new Error("A URL do Supabase deve começar com https://");
  }
  if (cleanKey.includes("service_role")) {
    throw new Error("Chave service_role bloqueada por segurança. Use apenas a chave anon/public.");
  }

  db = createClient(cleanUrl, cleanKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  db.auth.onAuthStateChange((_event, session) => {
    user = session?.user || null;
  });

  const { data, error } = await db.auth.getSession();
  if (error) throw error;

  localStorage.setItem("crm_url", cleanUrl);
  localStorage.setItem("crm_key", cleanKey);

  if (!data?.session) {
    showScreen("login-screen");
    return;
  }

  user = data.session.user;
  await enterAuthenticatedApp();
}

async function enterAuthenticatedApp() {
  try {
    const activeUser = await ensureActiveUser();
    $("user-email").textContent = activeUser.email || "Usuário conectado";
    showScreen("app-screen");
    await loadCustomSettings();
    await loadLeads(true);
  } catch {
    showScreen("login-screen");
  }
}

function bindEvents() {
  $("config-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("config-error");
    const btn = $("connect-btn");
    errEl.textContent = "";
    btn.disabled = true;
    btn.textContent = "Conectando...";
    try {
      await connectSupabase($("supabase-url").value, $("supabase-key").value);
    } catch (err) {
      errEl.textContent = translateSupabaseError(err);
    } finally {
      btn.disabled = false;
      btn.textContent = "Conectar";
    }
  });

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("login-error");
    const btn = $("login-btn");
    errEl.textContent = "";

    const email = $("login-email").value.trim();
    const password = $("login-password").value;

    if (!email || !password) {
      errEl.textContent = "Preencha seu e-mail e senha.";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Entrando...";
    try {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) {
        errEl.textContent = translateSupabaseError(error);
        return;
      }
      user = data.user;
      await enterAuthenticatedApp();
    } catch (err) {
      errEl.textContent = translateSupabaseError(err);
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });

  $("change-supabase-btn").onclick = () => {
    localStorage.removeItem("crm_url");
    localStorage.removeItem("crm_key");
    showScreen("config-screen");
  };

  $("logout-btn").onclick = async () => {
    if (db) await db.auth.signOut();
    user = null;
    leads = [];
    selectedLeadIds.clear();
    showScreen("login-screen");
    toast("Sessão encerrada.");
  };

  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.onclick = () => switchView(b.dataset.view);
  });
  document.querySelectorAll("[data-goto]").forEach((b) => {
    b.onclick = () => switchView(b.dataset.goto);
  });

  document.querySelectorAll(".settings-tab").forEach((t) => {
    t.onclick = () => switchSettingsTab(t.dataset.stab);
  });

  $("goto-manage-messages-btn").onclick = () => {
    switchView("settings");
    switchSettingsTab("messages");
  };

  $("add-status-form").addEventListener("submit", handleAddStatus);
  $("add-dev-form").addEventListener("submit", handleAddDevelopment);
  $("open-new-msg-modal-btn").onclick = () => openMessageEditor(null);
  $("message-editor-form").addEventListener("submit", handleSaveMessageEditor);

  document.querySelectorAll("[data-insert-var]").forEach((btn) => {
    btn.onclick = () => {
      const ta = $("msg-edit-content");
      const v = btn.dataset.insertVar;
      const start = ta.selectionStart ?? ta.value.length;
      const end = ta.selectionEnd ?? ta.value.length;
      ta.value = ta.value.slice(0, start) + v + ta.value.slice(end);
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + v.length;
    };
  });

  $("settings-view").addEventListener("click", async (e) => {
    const activeUser = await ensureActiveUser().catch(() => null);
    if (!activeUser) return;

    const editSt = e.target.closest("[data-edit-status]");
    if (editSt) {
      const id = editSt.dataset.editStatus;
      const oldName = editSt.dataset.stName;
      const newName = sanitizeText(prompt("Novo nome para o status:", oldName));
      if (!newName || newName === oldName) return;
      if (id) {
        await db.from("custom_statuses").update({ name: newName }).eq("id", id).eq("user_id", activeUser.id);
      }
      await db.from("leads").update({ status: newName }).eq("status", oldName).eq("user_id", activeUser.id);
      toast("Status atualizado!");
      await loadCustomSettings();
      await loadLeads();
      return;
    }

    const delSt = e.target.closest("[data-del-status]");
    if (delSt) {
      const id = delSt.dataset.delStatus;
      const stName = delSt.dataset.stName;
      if (customStatuses.length <= 1) {
        toast("Você precisa manter pelo menos 1 status cadastrado.");
        return;
      }
      if (!confirm(`Excluir o status "${stName}"?`)) return;
      if (id) {
        await db.from("custom_statuses").delete().eq("id", id).eq("user_id", activeUser.id);
      }
      toast("Status excluído.");
      await loadCustomSettings();
      return;
    }

    const defDev = e.target.closest("[data-default-dev]");
    if (defDev) {
      const id = defDev.dataset.defaultDev;
      await db.from("custom_developments").update({ is_default: false }).eq("user_id", activeUser.id);
      await db.from("custom_developments").update({ is_default: true }).eq("id", id).eq("user_id", activeUser.id);
      toast("Empreendimento padrão atualizado!");
      await loadCustomSettings();
      return;
    }

    const editDev = e.target.closest("[data-edit-dev]");
    if (editDev) {
      const id = editDev.dataset.editDev;
      const oldName = editDev.dataset.devName;
      const newName = sanitizeText(prompt("Novo nome para o empreendimento:", oldName));
      if (!newName || newName === oldName) return;
      if (id) {
        await db.from("custom_developments").update({ name: newName }).eq("id", id).eq("user_id", activeUser.id);
      }
      await db.from("leads").update({ development: newName }).eq("development", oldName).eq("user_id", activeUser.id);
      toast("Empreendimento atualizado!");
      await loadCustomSettings();
      await loadLeads();
      return;
    }

    const delDev = e.target.closest("[data-del-dev]");
    if (delDev) {
      const id = delDev.dataset.delDev;
      const devName = delDev.dataset.devName;
      if (customDevelopments.length <= 1) {
        toast("Você precisa manter pelo menos 1 empreendimento.");
        return;
      }
      if (!confirm(`Excluir o empreendimento "${devName}"?`)) return;
      if (id) {
        await db.from("custom_developments").delete().eq("id", id).eq("user_id", activeUser.id);
      }
      toast("Empreendimento excluído.");
      await loadCustomSettings();
      return;
    }

    const editMsg = e.target.closest("[data-edit-msg]");
    if (editMsg) {
      const id = editMsg.dataset.editMsg;
      const msgObj = customMessages.find((m) => m.id === id);
      if (msgObj) openMessageEditor(msgObj);
      return;
    }

    const delMsg = e.target.closest("[data-del-msg]");
    if (delMsg) {
      const id = delMsg.dataset.delMsg;
      const title = delMsg.dataset.msgTitle;
      if (customMessages.length <= 1) {
        toast("Mantenha pelo menos 1 mensagem na biblioteca.");
        return;
      }
      if (!confirm(`Excluir a mensagem "${title}"?`)) return;
      if (id) {
        await db.from("custom_messages").delete().eq("id", id).eq("user_id", activeUser.id);
      }
      toast("Mensagem excluída.");
      await loadCustomSettings();
      renderMessages();
    }
  });

  $("new-lead-top").onclick = () => openLeadForm(null);
  $("lead-form").addEventListener("submit", saveLead);

  ["lead-search", "status-filter", "development-filter"].forEach((id) => {
    $(id).addEventListener("input", () => {
      visibleLeadsLimit = LEADS_PAGE_SIZE;
      renderLeads();
    });
    $(id).addEventListener("change", () => {
      visibleLeadsLimit = LEADS_PAGE_SIZE;
      renderLeads();
    });
  });

  $("show-archived").addEventListener("change", () => {
    selectedLeadIds.clear();
    visibleLeadsLimit = LEADS_PAGE_SIZE;
    renderLeads();
  });

  $("clear-filters-btn").addEventListener("click", () => {
    $("lead-search").value = "";
    $("status-filter").value = "";
    $("development-filter").value = "";
    visibleLeadsLimit = LEADS_PAGE_SIZE;
    renderLeads();
  });

  $("load-more-leads-btn").addEventListener("click", () => {
    visibleLeadsLimit += LEADS_PAGE_SIZE;
    renderLeads();
  });

  $("toggle-selection-mode-btn").addEventListener("click", () => {
    setSelectionMode(!selectionMode);
  });

  $("exit-selection-mode-btn").addEventListener("click", () => {
    setSelectionMode(false);
  });

  $("bulk-select-all-filtered").addEventListener("click", () => {
    for (const item of currentFilteredLeads) {
      selectedLeadIds.add(item.id);
    }
    renderLeads();
  });

  $("bulk-clear-selection").addEventListener("click", () => {
    selectedLeadIds.clear();
    renderLeads();
  });

  $("bulk-apply-status-btn").addEventListener("click", executeBulkStatusUpdate);
  $("bulk-apply-dev-btn").addEventListener("click", executeBulkDevelopmentUpdate);
  $("bulk-archive-btn").addEventListener("click", () => executeBulkArchiveToggle(true));
  $("bulk-restore-btn").addEventListener("click", () => executeBulkArchiveToggle(false));
  $("bulk-delete-btn").addEventListener("click", () => {
    openDeleteConfirm([...selectedLeadIds]);
  });

  $("leads-table").addEventListener("change", (e) => {
    if (e.target.id === "select-all-visible-checkbox") {
      const visibleSlice = currentFilteredLeads.slice(0, visibleLeadsLimit);
      if (e.target.checked) {
        for (const item of visibleSlice) selectedLeadIds.add(item.id);
      } else {
        for (const item of visibleSlice) selectedLeadIds.delete(item.id);
      }
      renderLeads();
      return;
    }

    const rowCheckbox = e.target.closest(".lead-row-checkbox");
    if (rowCheckbox) {
      const id = rowCheckbox.dataset.selectId;
      if (rowCheckbox.checked) selectedLeadIds.add(id);
      else selectedLeadIds.delete(id);
      renderLeads();
    }
  });

  const handleTableClick = (e) => {
    const detailBtn = e.target.closest("[data-detail]");
    if (detailBtn) {
      openLeadDetails(detailBtn.dataset.detail);
      return;
    }
    const delBtn = e.target.closest("[data-delete]");
    if (delBtn) {
      openDeleteConfirm([delBtn.dataset.delete]);
      return;
    }
    const waBtn = e.target.closest("[data-wa]");
    if (waBtn) {
      const lead = leads.find((x) => x.id === waBtn.dataset.wa);
      if (lead) openWhatsAppForLead(lead, 0);
    }
  };
  $("leads-table").addEventListener("click", handleTableClick);
  $("upcoming-list").addEventListener("click", handleTableClick);

  $("message-search").addEventListener("input", renderMessages);
  $("message-list").addEventListener("click", async (e) => {
    const copyBtn = e.target.closest("[data-copy-idx]");
    if (!copyBtn) return;
    const msg = customMessages[Number(copyBtn.dataset.copyIdx)];
    if (!msg) return;
    try {
      await navigator.clipboard.writeText(msg.content);
      toast("Mensagem copiada para a área de transferência!");
    } catch {
      toast("Não foi possível copiar automaticamente. Selecione e copie o texto.");
    }
  });

  document.querySelectorAll("[data-close]").forEach((b) => {
    b.onclick = () => {
      const dlg = $(b.dataset.close);
      if (dlg && dlg.open) dlg.close();
    };
  });

  $("open-import-top").onclick = openImportDialog;
  $("open-import-inline").onclick = openImportDialog;
  $("import-file-input").addEventListener("change", handleFileUpload);
  $("import-archive-discarded").addEventListener("change", updateImportPreview);
  $("confirm-import-btn").addEventListener("click", executeBatchImport);

  $("confirm-delete-btn").addEventListener("click", executePermanentDelete);

  $("run-diagnostics-btn").addEventListener("click", runDatabaseDiagnostics);
}

(async function init() {
  bindEvents();
  const savedUrl = localStorage.getItem("crm_url") || sessionStorage.getItem("crm_url");
  const savedKey = localStorage.getItem("crm_key") || sessionStorage.getItem("crm_key");
  if (savedUrl && savedKey) {
    $("supabase-url").value = savedUrl;
    $("supabase-key").value = savedKey;
    try {
      await connectSupabase(savedUrl, savedKey);
    } catch {
      localStorage.removeItem("crm_url");
      localStorage.removeItem("crm_key");
      showScreen("config-screen");
    }
  } else {
    showScreen("config-screen");
  }
})();

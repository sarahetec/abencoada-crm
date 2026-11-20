import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const $ = (id) => document.getElementById(id);

const VALID_STATUSES = [
  "Pendente",
  "Mensagem enviada",
  "Retornar depois",
  "Visita marcada",
  "Visita realizada",
  "Sem resposta",
  "Não tem interesse",
  "Convertido"
];

const VALID_DEVELOPMENTS = ["Dom Parque", "Dom Barueri", "Outro"];

const MESSAGES = [
  [1, "Primeira abordagem", "Olá! Tudo bem? 😊 Sou assistente da corretora Abençoada. Recebemos seu interesse no empreendimento Dom Parque, em Barueri, e estou entrando em contato para te apresentar esse projeto! Gostaria de saber: você teria disponibilidade para conhecer o empreendimento esta semana?"],
  [2, "Cliente interessado", "Que bom saber do seu interesse! 😊 Para organizar o melhor atendimento, gostaria de entender como prefere conhecer o empreendimento: presencialmente, por videochamada ou por telefone?"],
  [3, "Não pode visitar", "Sem problemas! 😊 Podemos conversar por telefone ou WhatsApp para eu te apresentar melhor o projeto. Qual seria o melhor horário para você?"],
  [4, "Oferecer horários", "Tenho algumas opções de horário para conversarmos: manhã (9h às 11h), horário de almoço (12h às 14h), tarde (15h às 17h) ou noite (18h às 20h). Qual período funciona melhor para você? Vou confirmar a disponibilidade antes de agendar."],
  [5, "Prefere WhatsApp", "Claro! Podemos conversar por aqui mesmo. 😊 Gostaria de reservar alguns minutinhos para apresentar o projeto e entender o que você procura. Você consegue conversar hoje? Qual horário seria melhor?"],
  [6, "Prefere telefone", "Perfeito! 😊 Para nossa ligação, você prefere o período da manhã ou da tarde? Assim consigo organizar o melhor horário."],
  [7, "Prefere videochamada", "Ótimo! Podemos fazer uma videochamada pelo WhatsApp para apresentar o empreendimento. Qual horário fica melhor para você?"],
  [8, "Sem tempo", "Entendo perfeitamente! Podemos fazer uma conversa rápida, de 5 a 10 minutos, só para apresentar os principais pontos. Qual período costuma ser mais tranquilo para você?"],
  [9, "Pergunta sobre preço", "Os valores e condições podem variar conforme a opção escolhida. Para te orientar corretamente, podemos organizar uma conversa rápida e entender o que você procura. Qual seria o melhor horário?"],
  [10, "Pergunta sobre disponibilidade", "Posso consultar as opções disponíveis para você. A corretora consegue apresentar os planos e verificar as unidades. Podemos conversar hoje para entender melhor o que você procura?"],
  [11, "Visualizou e não respondeu", "Olá! Tudo bem? Passando para saber se conseguiu ver minha mensagem anterior e se ainda tem interesse em conhecer o Dom Parque. Se preferir, podemos combinar um atendimento rápido, sem compromisso. 😊"],
  [12, "Segunda tentativa", "Olá! Tudo bem? Estou retomando nosso contato sobre o Dom Parque. Gostaria de saber se ainda tem interesse em conhecer o empreendimento. Podemos conversar por telefone, videochamada ou WhatsApp, como preferir. 😊"],
  [13, "Vai pensar", "Claro, fique à vontade para avaliar com calma! 😊 Se ajudar, podemos fazer uma conversa rápida para você conhecer melhor o projeto antes de decidir."],
  [14, "Outro momento", "Sem problemas! Podemos combinar para outro dia. Qual dia da próxima semana costuma ser melhor para você?"],
  [15, "Confirmação de visita", "Olá! 😊 Passando para confirmar nossa visita ao Dom Parque.\n\n📅 Data: [DATA]\n⏰ Horário: [HORÁRIO]\n\nSerá um prazer receber você!"],
  [16, "Confirmação de atendimento", "Olá! 😊 Confirmando nosso atendimento:\n\n📅 Data: [DATA]\n⏰ Horário: [HORÁRIO]\n📍 Modalidade: [LIGAÇÃO / VIDEOCHAMADA / WHATSAPP]\n\nAté lá!"],
  [17, "Não conseguiu contato", "Olá! Tudo bem? Tentei entrar em contato, mas não conseguimos conversar. Qual seria o melhor horário para tentar novamente? 😊"],
  [18, "Convite após conversa", "Foi muito bom conversar com você! 😊 Que tal agendarmos uma visita para conhecer o Dom Parque pessoalmente? Assim você consegue entender melhor o projeto."],
  [19, "Interessado, mas indeciso", "Entendo! É importante avaliar com tranquilidade. Se quiser, posso organizar uma conversa com a corretora para esclarecer suas dúvidas e apresentar as opções disponíveis."],
  [20, "Encerramento cordial", "Agradeço pela atenção e pelo tempo! 😊 Se surgir interesse ou alguma dúvida sobre o Dom Parque, fico à disposição. Tenha um ótimo dia!"]
];

let db = null;
let user = null;
let leads = [];
let selectedLead = null;
let currentWorkbook = null;
let parsedImportRows = [];

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const toast = (msg) => {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2800);
};

const slug = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

function phoneDigits(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (String(raw || "").includes("/")) {
    const firstPart = String(raw).split("/")[0];
    d = firstPart.replace(/\D/g, "");
  }
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length >= 11) d = d.slice(1);
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    d = d.slice(2);
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
  return String(raw || "").trim();
}

function adaptMessageForLead(msgText, lead) {
  let text = String(msgText || MESSAGES[0][2]);
  if (lead?.development && lead.development !== "Dom Parque") {
    if (lead.development === "Dom Barueri") {
      text = text.replace(/Dom Parque/g, "Dom Barueri");
    } else {
      text = text.replace(/o empreendimento Dom Parque, em Barueri/g, "o nosso empreendimento");
      text = text.replace(/ao Dom Parque/g, "ao empreendimento");
      text = text.replace(/o Dom Parque/g, "o empreendimento");
      text = text.replace(/sobre o Dom Parque/g, "sobre o empreendimento");
    }
  }
  return text;
}

function buildWhatsAppUrl(lead, rawMessage) {
  let digits = phoneDigits(lead?.phone);
  if (!digits) return null;
  if (!digits.startsWith("55")) {
    digits = "55" + digits;
  }
  const message = adaptMessageForLead(rawMessage, lead);
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`;
}

function openWhatsAppForLead(lead, msgIndex = 0) {
  const template = MESSAGES[msgIndex]?.[2] || MESSAGES[0][2];
  const url = buildWhatsAppUrl(lead, template);
  if (!url) {
    toast("Telefone inválido para abrir o WhatsApp.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
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
    return "Tabela não encontrada no banco. Execute o script supabase-schema.sql no SQL Editor do Supabase.";
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

async function addHistory(leadId, action, details = "") {
  if (!db || !user?.id || !leadId) return;
  try {
    const { error } = await db.from("lead_history").insert({
      lead_id: leadId,
      user_id: user.id,
      action,
      details
    });
    if (error) console.warn("Aviso ao registrar histórico:", error.message);
  } catch (e) {
    console.warn("Exceção ao registrar histórico:", e);
  }
}

async function loadLeads() {
  if (!db || !user?.id) return;
  try {
    const { data, error } = await db
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast("Erro ao carregar contatos: " + translateSupabaseError(error));
      console.error("Erro loadLeads:", error);
      return;
    }

    leads = Array.isArray(data) ? data : [];
    renderDashboard();
    renderLeads();
  } catch (err) {
    toast("Erro inesperado ao buscar leads.");
    console.error(err);
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
    diagnostics: "Diagnóstico do banco"
  };
  $("page-title").textContent = titles[viewName] || "Abençoada CRM";

  if (viewName === "messages") renderMessages();
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

function renderLeads() {
  const q = $("lead-search").value.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const statusFilter = $("status-filter").value;
  const devFilter = $("development-filter").value;
  const showArchived = $("show-archived").checked;

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

  const totalActive = leads.filter((x) => !x.archived).length;
  const totalArch = leads.filter((x) => x.archived).length;
  $("leads-count-label").textContent = `Exibindo ${filtered.length} de ${showArchived ? totalArch + " arquivados" : totalActive + " ativos"}`;

  $("leads-table").innerHTML = filtered.length
    ? `<table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Empreendimento</th>
            <th>Status</th>
            <th>Próxima ação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map(
              (x) => `<tr>
                <td>
                  <b>${esc(x.name)}</b>
                  ${x.archived ? '<span class="badge-archived">Arquivado</span>' : ""}
                </td>
                <td>${esc(x.phone)}</td>
                <td>${esc(x.development)}</td>
                <td><span class="status ${slug(x.status)}">${esc(x.status)}</span></td>
                <td>${esc(formatDateBR(x.next_action_date))}</td>
                <td class="row-actions">
                  <button type="button" class="table-action wa-inline" data-wa="${esc(x.id)}" title="Abrir conversa no WhatsApp">WhatsApp</button>
                  <button type="button" class="table-action" data-detail="${esc(x.id)}">Detalhes</button>
                </td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>`
    : '<div class="empty">Nenhum lead encontrado com os filtros atuais.</div>';
}

function renderMessages() {
  const q = $("message-search").value.trim().toLowerCase();
  const list = MESSAGES.filter(
    (m) =>
      !q ||
      String(m[0]).includes(q) ||
      m[1].toLowerCase().includes(q) ||
      m[2].toLowerCase().includes(q)
  );

  $("message-list").innerHTML =
    list
      .map(
        (m) => `<article class="message-card">
          <span class="message-number">MENSAGEM ${String(m[0]).padStart(2, "0")}</span>
          <h3>${esc(m[1])}</h3>
          <p>${esc(m[2])}</p>
          <div class="message-actions">
            <span class="tiny">Modelo de atendimento</span>
            <button type="button" class="secondary" data-copy="${m[0]}">Copiar texto</button>
          </div>
        </article>`
      )
      .join("") || '<div class="empty">Nenhuma mensagem encontrada.</div>';
}

function openLeadForm(lead = null) {
  const formEl = $("lead-form");
  formEl.reset();
  $("lead-error").textContent = "";
  $("lead-id").value = lead?.id || "";
  $("dialog-title").textContent = lead ? "Editar lead" : "Novo lead";
  $("lead-name").value = lead?.name || "";
  $("lead-phone").value = lead?.phone || "";
  $("lead-development").value = VALID_DEVELOPMENTS.includes(lead?.development)
    ? lead.development
    : "Dom Parque";
  $("lead-status").value = VALID_STATUSES.includes(lead?.status) ? lead.status : "Pendente";
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

  if (!db || !user?.id) {
    errEl.textContent = "Sessão não autenticada. Faça login novamente antes de salvar.";
    return;
  }

  const id = $("lead-id").value.trim();
  const name = $("lead-name").value.trim();
  const rawPhone = $("lead-phone").value.trim();

  if (!name || !rawPhone) {
    errEl.textContent = "Preencha os campos obrigatórios: Nome do cliente e Telefone com DDD.";
    return;
  }

  const digits = phoneDigits(rawPhone);
  if (digits.length < 10 || digits.length > 11) {
    errEl.textContent = "Informe um telefone brasileiro válido com DDD (10 ou 11 dígitos).";
    return;
  }

  const payload = {
    user_id: user.id,
    name,
    phone: normalizePhoneForStorage(rawPhone),
    development: $("lead-development").value || "Dom Parque",
    status: $("lead-status").value || "Pendente",
    preferred_modality: $("lead-modality").value || null,
    next_action_date: $("lead-next-date").value || null,
    notes: $("lead-notes").value.trim() || null
  };

  btn.disabled = true;
  btn.textContent = "Salvando...";

  try {
    let result;
    if (id) {
      result = await db
        .from("leads")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
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
      console.error("Erro Supabase saveLead:", result.error);
      return;
    }

    if (!result.data) {
      errEl.textContent = "O banco não retornou o registro salvo. Verifique as políticas RLS da tabela leads.";
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
    console.error("Exceção saveLead:", err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Salvar lead";
  }
}

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
  msgSelect.innerHTML = MESSAGES.map(
    (m, idx) => `<option value="${idx}">${String(m[0]).padStart(2, "0")} — ${esc(m[1])}</option>`
  ).join("");

  const updatePreview = () => {
    const idx = Number(msgSelect.value) || 0;
    $("detail-msg-preview").textContent = adaptMessageForLead(MESSAGES[idx][2], l);
  };
  msgSelect.onchange = updatePreview;
  updatePreview();

  $("detail-whatsapp").onclick = () => {
    const idx = Number(msgSelect.value) || 0;
    openWhatsAppForLead(l, idx);
  };

  $("detail-sent").onclick = async () => {
    try {
      const { error } = await db
        .from("leads")
        .update({
          status: "Mensagem enviada",
          last_contacted_at: new Date().toISOString()
        })
        .eq("id", l.id)
        .eq("user_id", user.id);

      if (error) {
        toast("Erro ao atualizar status: " + translateSupabaseError(error));
        return;
      }

      await addHistory(l.id, "Mensagem marcada como enviada", "Confirmação manual após envio no WhatsApp.");
      $("detail-dialog").close();
      toast("Status atualizado para Mensagem enviada.");
      await loadLeads();
    } catch (err) {
      toast("Erro inesperado ao atualizar status.");
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
      const { error } = await db
        .from("leads")
        .update({ archived: nextArchived })
        .eq("id", l.id)
        .eq("user_id", user.id);

      if (error) {
        toast("Erro ao atualizar arquivamento: " + translateSupabaseError(error));
        return;
      }

      await addHistory(l.id, nextArchived ? "Lead arquivado" : "Lead restaurado");
      $("detail-dialog").close();
      toast(nextArchived ? "Lead arquivado." : "Lead restaurado para ativos.");
      await loadLeads();
    } catch (err) {
      toast("Erro inesperado ao arquivar/restaurar.");
    }
  };

  $("detail-history").innerHTML = '<p class="tiny">Carregando histórico...</p>';
  $("detail-dialog").showModal();

  try {
    const h = await db
      .from("lead_history")
      .select("*")
      .eq("lead_id", id)
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
  } catch (err) {
    $("detail-history").innerHTML = '<p class="tiny">Erro ao carregar histórico.</p>';
  }
}

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

    const { data: userData, error: userErr } = await db.auth.getUser();
    if (userErr || !userData?.user) {
      pushCheck("2. Autenticação e Sessão", false, translateSupabaseError(userErr) || "Usuário não autenticado.");
      return;
    }
    user = userData.user;
    pushCheck("2. Autenticação e Sessão", true, `Autenticado como ${user.email} (ID: ${user.id}).`);

    const { data: readData, error: readErr } = await db.from("leads").select("id").limit(5);
    if (readErr) {
      pushCheck("3. Leitura na tabela leads", false, translateSupabaseError(readErr));
      return;
    }
    pushCheck("3. Leitura na tabela leads", true, `Leitura bem-sucedida (${readData.length} registro(s) visíveis nesta amostra).`);

    const testPayload = {
      user_id: user.id,
      name: "__TESTE_DIAGNOSTICO_CRM__",
      phone: "(11) 90000-0000",
      development: "Outro",
      status: "Pendente",
      notes: "Registro temporário de verificação de persistência."
    };

    const { data: insData, error: insErr } = await db
      .from("leads")
      .insert(testPayload)
      .select()
      .single();

    if (insErr || !insData?.id) {
      pushCheck("4. Gravação e Políticas RLS (INSERT)", false, translateSupabaseError(insErr));
      return;
    }
    pushCheck("4. Gravação e Políticas RLS (INSERT)", true, `Registro gravado com sucesso (ID: ${insData.id}).`);

    const { data: verifyData, error: verifyErr } = await db
      .from("leads")
      .select("id, name, user_id")
      .eq("id", insData.id)
      .single();

    if (verifyErr || !verifyData) {
      pushCheck("5. Confirmação de Persistência", false, "Registro gravado, mas não pôde ser relido.");
    } else {
      pushCheck("5. Confirmação de Persistência", true, "Persistência confirmada no PostgreSQL/Supabase.");
    }

    await db.from("leads").delete().eq("id", insData.id).eq("user_id", user.id);
    pushCheck("6. Limpeza do Teste", true, "Registro temporário de diagnóstico removido automaticamente.");
  } catch (err) {
    pushCheck("Erro inesperado", false, translateSupabaseError(err));
  } finally {
    btn.disabled = false;
    btn.textContent = "Executar verificação completa";
  }
}

function openImportDialog() {
  $("import-file-input").value = "";
  $("import-sheet-row").classList.add("hidden");
  $("import-mapping-box").classList.add("hidden");
  $("import-report-box").classList.add("hidden");
  $("confirm-import-btn").classList.add("hidden");
  $("import-error").textContent = "";
  currentWorkbook = null;
  parsedImportRows = [];
  $("import-dialog").showModal();
}

function handleFileUpload(e) {
  const file = e.target.files?.[0];
  $("import-error").textContent = "";
  $("import-report-box").classList.add("hidden");
  if (!file) return;

  if (typeof window.XLSX === "undefined") {
    $("import-error").textContent = "Biblioteca de leitura de planilhas ainda carregando. Aguarde 2 segundos e tente novamente.";
    return;
  }

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      currentWorkbook = window.XLSX.read(data, { type: "array" });
      const sheetNames = currentWorkbook.SheetNames || [];

      if (!sheetNames.length) {
        $("import-error").textContent = "Nenhuma aba encontrada no arquivo.";
        return;
      }

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
      $("import-error").textContent = "Erro ao ler o arquivo: " + err.message;
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

function buildPreparedImportList() {
  const colName = $("map-name").value;
  const colPhone = $("map-phone").value;
  const colDev = $("map-dev").value;
  const colPrev = $("map-prev-status").value;
  const colStatus = $("map-status").value;
  const colNotes = $("map-notes").value;
  const skipDuplicates = $("import-skip-duplicates").checked;
  const archiveDiscarded = $("import-archive-discarded").checked;

  const existingPhones = new Set(leads.map((l) => phoneDigits(l.phone)).filter(Boolean));
  const seenInBatch = new Set();

  return parsedImportRows.map((row, index) => {
    const name = String(row[colName] || "").trim();
    const rawPhone = String(row[colPhone] || "").trim();
    const digits = phoneDigits(rawPhone);
    const formattedPhone = normalizePhoneForStorage(rawPhone);

    const rawDev = String(row[colDev] || "").trim();
    let development = "Dom Parque";
    if (/barueri/i.test(rawDev)) development = "Dom Barueri";
    else if (/parque/i.test(rawDev)) development = "Dom Parque";
    else if (rawDev) development = "Outro";

    const rawStatus = String(row[colStatus] || "").trim();
    const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : "Pendente";

    const prevStatus = String(row[colPrev] || "").trim();
    const rawNotes = String(row[colNotes] || "").trim();

    const noteParts = [];
    if (prevStatus) noteParts.push(`Situação anterior no app: ${prevStatus}`);
    if (rawDev && !["Dom Parque", "Dom Barueri"].includes(rawDev)) noteParts.push(`Lista original: ${rawDev}`);
    if (rawNotes) noteParts.push(rawNotes);
    const notes = noteParts.length ? noteParts.join(" | ") : null;

    const archived = archiveDiscarded && /^descartado$/i.test(prevStatus);

    let skipReason = "";
    if (!name || !digits) {
      skipReason = "Nome ou telefone ausente";
    } else if (skipDuplicates && existingPhones.has(digits)) {
      skipReason = "Já existe no CRM";
    } else if (skipDuplicates && seenInBatch.has(digits)) {
      skipReason = "Telefone duplicado na planilha";
    }

    if (!skipReason && digits) {
      seenInBatch.add(digits);
    }

    const phoneWarning = digits && (digits.length < 10 || digits.length > 11)
      ? "Telefone fora do padrão (conferir)"
      : "";

    return {
      rowNum: index + 2,
      name,
      phone: formattedPhone,
      digits,
      development,
      status,
      prevStatus,
      notes,
      archived,
      skipReason,
      phoneWarning
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

  const list = buildPreparedImportList();
  const ready = list.filter((x) => !x.skipReason);
  const skipped = list.filter((x) => x.skipReason);
  const warnings = ready.filter((x) => x.phoneWarning);

  $("confirm-import-btn").disabled = ready.length === 0;
  $("confirm-import-btn").textContent = `Importar ${ready.length} contato(s)`;

  $("import-preview-stats").innerHTML = `
    <span class="pill ok">Prontos para importar: <b>${ready.length}</b></span>
    <span class="pill warn">Ignorados / Duplicados: <b>${skipped.length}</b></span>
    <span class="pill info">Telefones para conferir: <b>${warnings.length}</b></span>
  `;

  $("import-preview-table").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Linha</th>
          <th>Nome</th>
          <th>Telefone</th>
          <th>Empreendimento</th>
          <th>Situação anterior</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        ${list
          .slice(0, 25)
          .map(
            (item) => `<tr class="${item.skipReason ? "row-muted" : ""}">
              <td>${item.rowNum}</td>
              <td>${esc(item.name || "—")}</td>
              <td>${esc(item.phone || "—")}</td>
              <td>${esc(item.development)}</td>
              <td>${esc(item.prevStatus || "—")}</td>
              <td>${
                item.skipReason
                  ? `<span class="tag-skip">${esc(item.skipReason)}</span>`
                  : item.phoneWarning
                  ? `<span class="tag-warn">Importar (${esc(item.phoneWarning)})</span>`
                  : `<span class="tag-ok">Pronto</span>`
              }</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>
    ${list.length > 25 ? `<p class="tiny" style="margin-top:.5rem">Exibindo os primeiros 25 de ${list.length} registros analisados.</p>` : ""}
  `;
}

async function executeBatchImport() {
  const btn = $("confirm-import-btn");
  const errEl = $("import-error");
  errEl.textContent = "";

  if (!db || !user?.id) {
    errEl.textContent = "Sessão expirada. Faça login novamente.";
    return;
  }

  const list = buildPreparedImportList();
  const toInsert = list.filter((x) => !x.skipReason);
  const skipped = list.filter((x) => x.skipReason);

  if (!toInsert.length) {
    errEl.textContent = "Nenhum contato válido para importar.";
    return;
  }

  btn.disabled = true;
  btn.textContent = `Importando ${toInsert.length} contatos...`;

  try {
    const records = toInsert.map((x) => ({
      user_id: user.id,
      name: x.name,
      phone: x.phone,
      development: x.development,
      status: x.status,
      notes: x.notes,
      archived: x.archived
    }));

    const chunkSize = 50;
    const insertedAll = [];

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const { data, error } = await db.from("leads").insert(chunk).select("id, name, development");
      if (error) {
        throw error;
      }
      if (data) insertedAll.push(...data);
    }

    if (insertedAll.length) {
      const historyRows = insertedAll.map((item) => ({
        lead_id: item.id,
        user_id: user.id,
        action: "Lead importado em lote",
        details: `Importação via planilha (${item.development})`
      }));
      for (let i = 0; i < historyRows.length; i += chunkSize) {
        await db.from("lead_history").insert(historyRows.slice(i, i + chunkSize));
      }
    }

    $("import-mapping-box").classList.add("hidden");
    $("confirm-import-btn").classList.add("hidden");
    $("import-report-box").classList.remove("hidden");
    $("import-report-box").innerHTML = `
      <h3>Relatório de Importação Concluída</h3>
      <ul>
        <li><b>Total analisado na planilha:</b> ${list.length}</li>
        <li><b>Contatos gravados no Supabase:</b> ${insertedAll.length}</li>
        <li><b>Ignorados (duplicados ou incompletos):</b> ${skipped.length}</li>
      </ul>
      ${
        skipped.length
          ? `<details><summary>Ver detalhes dos ${skipped.length} ignorados</summary><ul>${skipped
              .map((s) => `<li>Linha ${s.rowNum}: ${esc(s.name || "Sem nome")} (${esc(s.phone || "Sem tel.")}) — ${esc(s.skipReason)}</li>`)
              .join("")}</ul></details>`
          : ""
      }
    `;

    toast(`${insertedAll.length} contatos importados com sucesso!`);
    await loadLeads();
  } catch (err) {
    errEl.textContent = "Falha durante a importação: " + translateSupabaseError(err);
    console.error("Erro importação:", err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Confirmar e importar contatos";
  }
}

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

  const { data, error } = await db.auth.getSession();
  if (error) throw error;

  sessionStorage.setItem("crm_url", cleanUrl);
  sessionStorage.setItem("crm_key", cleanKey);

  if (!data?.session) {
    showScreen("login-screen");
    return;
  }

  user = data.session.user;
  await enterAuthenticatedApp();
}

async function enterAuthenticatedApp() {
  const { data, error } = await db.auth.getUser();
  if (error || !data?.user) {
    showScreen("login-screen");
    return;
  }
  user = data.user;
  $("user-email").textContent = user.email || "Usuário conectado";
  showScreen("app-screen");
  await loadLeads();
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
    sessionStorage.removeItem("crm_url");
    sessionStorage.removeItem("crm_key");
    showScreen("config-screen");
  };

  $("logout-btn").onclick = async () => {
    if (db) await db.auth.signOut();
    user = null;
    leads = [];
    showScreen("login-screen");
    toast("Sessão encerrada.");
  };

  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.onclick = () => switchView(b.dataset.view);
  });
  document.querySelectorAll("[data-goto]").forEach((b) => {
    b.onclick = () => switchView(b.dataset.goto);
  });

  $("new-lead-top").onclick = () => openLeadForm(null);
  $("lead-form").addEventListener("submit", saveLead);

  ["lead-search", "status-filter", "development-filter"].forEach((id) => {
    $(id).addEventListener("input", renderLeads);
    $(id).addEventListener("change", renderLeads);
  });
  $("show-archived").addEventListener("change", renderLeads);

  const handleTableClick = (e) => {
    const detailBtn = e.target.closest("[data-detail]");
    if (detailBtn) {
      openLeadDetails(detailBtn.dataset.detail);
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
    const copyBtn = e.target.closest("[data-copy]");
    if (!copyBtn) return;
    const msg = MESSAGES.find((x) => x[0] === Number(copyBtn.dataset.copy));
    if (!msg) return;
    try {
      await navigator.clipboard.writeText(msg[2]);
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
  $("import-skip-duplicates").addEventListener("change", updateImportPreview);
  $("import-archive-discarded").addEventListener("change", updateImportPreview);
  $("confirm-import-btn").addEventListener("click", executeBatchImport);

  $("run-diagnostics-btn").addEventListener("click", runDatabaseDiagnostics);
}

(async function init() {
  bindEvents();
  const savedUrl = sessionStorage.getItem("crm_url");
  const savedKey = sessionStorage.getItem("crm_key");
  if (savedUrl && savedKey) {
    $("supabase-url").value = savedUrl;
    $("supabase-key").value = savedKey;
    try {
      await connectSupabase(savedUrl, savedKey);
    } catch {
      sessionStorage.removeItem("crm_url");
      sessionStorage.removeItem("crm_key");
      showScreen("config-screen");
    }
  } else {
    showScreen("config-screen");
  }
})();

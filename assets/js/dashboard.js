/* =====================================================================
   FLUXO (site) · dashboard.js — fichas FAA, atrasos, concluídas e arquivados
   ===================================================================== */
(function () {
  'use strict';
  const $ = FL.$, esc = FL.esc, ic = FL.ic, fmt = FL.fmt, st = FL.status, Data = FL.data;

  let sess = null;
  let aba = 'fichas';
  let filtro = null;            // null | 'atrasado' | 'vencer'
  let menuId = null;
  const abertos = new Set();

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    sess = FL.guard();
    if (!sess) return;
    FL.shell({ page: 'dashboard', title: 'Dashboard', sub: 'Fichas de atendimento (FAA)' });

    $('#tabs').addEventListener('click', e => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      aba = b.dataset.tab;
      FL.$$('#tabs button').forEach(x => x.classList.toggle('on', x === b));
      $('#view-fichas').hidden = aba !== 'fichas';
      $('#view-arq').hidden = aba !== 'arq';
      const c = $('#content');
      if (c) c.scrollTop = 0;
      FL.atualizarSino();
    });

    $('#busca-conc').addEventListener('input', render);
    $('#busca-arq').addEventListener('input', renderArq);
    $('#content').addEventListener('click', onClick);
    document.addEventListener('click', e => {
      if (menuId !== null && !e.target.closest('.status-menu') && !e.target.closest('[data-acao="menu"]')) {
        menuId = null;
        render();
      }
    });

    const ficha = new URLSearchParams(location.search).get('ficha');
    if (ficha) abertos.add(ficha);

    render();
    if (ficha) setTimeout(() => {
      const el = document.querySelector('[data-card="' + ficha + '"]');
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 160);
  }

  const nomeUsuario = () => Data.perfil().nome;

  function estaAberta(id) { return abertos.has(id); }
  function toggle(id) {
    if (abertos.has(id)) abertos.delete(id); else abertos.add(id);
    menuId = null;
    render();
  }

  /* ---------------- Render geral ---------------- */
  function render() {
    renderAlerta();
    renderMetricas();
    renderAtivas();
    renderConc();
    renderArq();
    FL.atualizarSino();
  }

  function renderMetricas() {
    const ativas = Data.faasAtivas();
    const conc = Data.faasConcluidas();
    const c = { pendente: 0, executando: 0, atrasado: 0 };
    ativas.forEach(f => { c[st.statusDe(f)]++; });
    $('#metrics').innerHTML =
      metrica('amarela', 'Pendentes', c.pendente) +
      metrica('amarela', 'Executando', c.executando) +
      metrica('vermelha', 'Atrasadas', c.atrasado) +
      metrica('azul', 'Concluídas', conc.length);
  }
  function metrica(cor, rotulo, n) {
    return '<div class="metric"><span><i class="dot ' + cor + '"></i>' + rotulo + '</span><b>' + n + '</b></div>';
  }

  function renderAlerta() {
    const atras = Data.atrasadas();
    const av = Data.aVencer();
    let html = '';
    if (atras.length) {
      html += '<div class="alert-box late" role="alert">' + ic.alert +
        '<div class="ab-txt"><b>' + atras.length + ' FAA em atraso</b>' +
        '<span>Passaram do prazo de ' + st.PRAZO + ' dias. Este aviso só sai quando a ficha for concluída.</span></div>' +
        '<button type="button" class="btn-xs pri" data-acao="filtrar" data-filtro="atrasado">Ver</button></div>';
    } else if (av.length) {
      html += '<div class="alert-box warn" role="alert">' + ic.clock +
        '<div class="ab-txt"><b>' + av.length + ' FAA a vencer</b>' +
        '<span>Faltam até ' + st.ALERTA + ' dias para o prazo.</span></div>' +
        '<button type="button" class="btn-xs" data-acao="filtrar" data-filtro="vencer">Ver</button></div>';
    }
    $('#alerta-prazo').innerHTML = html;
  }

  function renderAtivas() {
    let lista = Data.faasAtivas();
    if (filtro === 'atrasado') lista = lista.filter(f => st.statusDe(f) === 'atrasado');
    if (filtro === 'vencer') lista = lista.filter(st.emAlerta);

    $('#filtro-ativo').innerHTML = filtro
      ? '<div class="row" style="margin:10px 0 4px"><span class="chip ' + (filtro === 'atrasado' ? 'danger' : 'warn') + '">' +
      (filtro === 'atrasado' ? 'Somente atrasadas' : 'Somente a vencer') +
      '</span><button class="btn-xs" data-acao="limpar-filtro">Limpar</button></div>'
      : '';

    $('#lista-ativas').innerHTML = lista.length
      ? lista.map(f => fichaCard(f)).join('')
      : vazio('check', 'Nenhuma ficha em andamento',
        'Tudo concluído por aqui. Crie uma nova FAA quando precisar.');
  }

  function renderConc() {
    const q = $('#busca-conc').value.trim();
    const todas = Data.faasConcluidas();
    const lista = filtrar(todas, q);
    $('#count-conc').textContent = q
      ? lista.length + ' de ' + todas.length
      : todas.length + (todas.length === 1 ? ' ficha' : ' fichas');
    $('#lista-conc').innerHTML = lista.length
      ? lista.map(f => fichaCard(f, true)).join('')
      : vazio('search', 'Nada encontrado',
        q ? 'Tente outro nome ou a data do pedido (dd/mm/aaaa).' : 'As fichas concluídas aparecem aqui.');
  }

  function filtrar(lista, q) {
    if (!q) return lista;
    const k = FL.key(q);
    const br = q.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    let iso = '';
    if (br) {
      const ano = br[3].length === 2 ? '20' + br[3] : br[3];
      iso = ano + '-' + String(br[2]).padStart(2, '0') + '-' + String(br[1]).padStart(2, '0');
    }
    return lista.filter(f =>
      FL.key(f.paciente).indexOf(k) >= 0 ||
      String(f.dataPedido).indexOf(q) >= 0 ||
      (iso && f.dataPedido === iso) ||
      fmt.dtBR(f.dataPedido).indexOf(q) >= 0
    );
  }

  /* ---------------- Card de ficha ---------------- */
  function opsStatus(f) {
    const o = [];
    if (f.status !== 'concluido') {
      if (f.status === 'pendente') o.push(['pegar', 'Pegar (Executando)']);
      o.push(['concluir', 'Concluir ficha']);
      if (f.status === 'executando') o.push(['liberar', 'Liberar (voltar a pendente)']);
    } else {
      o.push(['reabrir', 'Reabrir ficha']);
    }
    return o;
  }

  function fichaCard(f, concluida) {
    const sk = st.statusDe(f), S = st.ST[sk], p = st.progressoDe(f), ven = st.vencimentoDe(f);
    const aberto = estaAberta(f.id);
    const late = sk === 'atrasado';
    const dono = sess && f.dono === sess.uid;
    const barra = f.status === 'concluido' ? 'done' : late ? 'late' : st.emAlerta(f) ? 'warn' : '';
    const ops = opsStatus(f);

    const detalhe = aberto
      ? '<div class="ficha-detail">' +
      '<div class="detail-grid">' +
      '<div class="cell"><span>Pedido em</span><b>' + esc(fmt.dtBR(f.dataPedido)) + '</b></div>' +
      '<div class="cell"><span>Prazo até</span><b>' + esc(fmt.dtBR(ven)) + '</b></div>' +
      '<div class="cell"><span>Responsável</span><b>' + esc(f.donoNome || '—') + '</b></div>' +
      '<div class="cell"><span>' + (f.status === 'concluido' ? 'Concluído em' : 'Pegou') + '</span><b>' +
      esc(f.status === 'concluido'
        ? (f.concluidoEm ? new Date(f.concluidoEm).toLocaleDateString('pt-BR') : '—')
        : (f.executor || '—')) + '</b></div>' +
      '</div>' +
      '<div class="dates-label">Datas da FAA (' + (f.datas || []).length + ')</div>' +
      '<div class="dates-chips">' + (f.datas || []).slice().sort().map(d =>
        '<span class="date-chip">' + esc(fmt.dtBR(d)) + '</span>').join('') + '</div>' +
      '<div class="ficha-actions">' +
      '<button type="button" class="btn-xs pri" data-acao="ver" data-id="' + esc(f.id) + '">' + ic.eye + 'Visualizar</button>' +
      '<button type="button" class="btn-xs" data-acao="pdf" data-id="' + esc(f.id) + '">' + ic.download + 'PDF</button>' +
      '<span class="spacer"></span>' +
      (dono ? '<button type="button" class="btn-xs danger" data-acao="excluir" data-id="' + esc(f.id) + '" aria-label="Excluir ficha">' + ic.trash + '</button>' : '') +
      '</div>' +
      (dono ? '<div class="row" style="margin-top:9px;gap:6px;flex-wrap:nowrap">' +
        '<input type="date" data-data-id="' + esc(f.id) + '" value="' + esc(f.dataPedido) + '" aria-label="Data do pedido" style="flex:1;min-height:40px;font-size:13px">' +
        '<button type="button" class="btn-xs" data-acao="salvar-data" data-id="' + esc(f.id) + '">Salvar data</button>' +
        '</div>' : '') +
      '</div>'
      : '';

    return '<article class="ficha ' + (late ? 'late ' : '') + (concluida ? 'done ' : '') + (aberto ? 'open' : '') + '" data-card="' + esc(f.id) + '">' +
      '<button type="button" class="ficha-main" data-acao="toggle" data-id="' + esc(f.id) + '" aria-expanded="' + (aberto ? 'true' : 'false') + '">' +
      '<span class="dot ' + S.cor + '" style="margin-top:5px"></span>' +
      '<span class="ficha-info">' +
      '<span class="ficha-name">' + esc(f.paciente) +
      (late ? ' <span class="chip danger" style="padding:2px 7px;font-size:10px">atrasada</span>' : '') +
      '</span>' +
      '<span class="ficha-sub">Pedido em <b>' + esc(fmt.dtBR(f.dataPedido)) + '</b> · ' + (f.datas || []).length + ' data(s)' +
      (f.executor ? ' · ' + esc(f.executor) : '') + '</span>' +
      '</span>' +
      '<span class="ficha-arrow">' + ic.chevronDown + '</span>' +
      '</button>' +
      '<div class="ficha-meta">' +
      '<div class="progress-wrap">' +
      '<div class="progress-top"><span>' + esc(p.texto) + '</span><span>' + p.usados + '/' + st.PRAZO + ' dias</span></div>' +
      '<div class="progress ' + barra + '"><i style="width:' + p.pct + '%"></i></div>' +
      '</div>' +
      '<div class="ficha-due ' + (late ? 'late' : '') + '">' + ic.calendar + '<span>' + esc(fmt.dtBR(ven)) + '</span></div>' +
      '</div>' +
      '<div class="ficha-actions" style="margin-top:9px">' +
      '<button type="button" class="status-btn" data-acao="menu" data-id="' + esc(f.id) + '" aria-haspopup="true">' +
      '<i class="dot ' + S.cor + '" style="width:7px;height:7px;box-shadow:none"></i>' + esc(S.curto) +
      '<span class="caret">▾</span></button>' +
      '<span class="spacer"></span>' +
      '<span class="mut-sm">' + (f.status === 'concluido' ? 'Concluída' : late ? 'Fora do prazo' : 'No prazo') + '</span>' +
      '</div>' +
      (menuId === f.id ? '<div class="status-menu">' + ops.map(o =>
        '<button type="button" data-acao="' + o[0] + '" data-id="' + esc(f.id) + '">' + esc(o[1]) + '</button>').join('') +
        '</div>' : '') +
      detalhe +
      '</article>';
  }

  /* ---------------- Arquivados (provisórias) ---------------- */
  function renderArq() {
    const q = $('#busca-arq').value.trim();
    const todas = Data.arquivados();
    const k = FL.key(q);
    const lista = !q ? todas : todas.filter(p =>
      FL.key(p.nomeUsuario || '').indexOf(k) >= 0 ||
      String(p.data || '').indexOf(q) >= 0 ||
      fmt.dtBR(p.data || '').indexOf(q) >= 0 ||
      (p.numeros || []).some(n => String(n).indexOf(q) >= 0)
    );

    $('#lista-arq').innerHTML = lista.length
      ? lista.map(arqCard).join('')
      : vazio('archive', 'Nenhuma provisória arquivada',
        'Ao salvar uma provisória na tela dela, você pode enviá-la para os arquivados do dashboard.');
  }

  function arqCard(p) {
    const aberto = estaAberta(p.id);
    return '<article class="saved ' + (aberto ? 'open' : '') + '" data-card="' + esc(p.id) + '">' +
      '<div class="saved-head">' +
      '<div class="ico">' + ic.archive + '</div>' +
      '<div class="inf"><b>Provisória de ' + esc(p.nomeUsuario || '—') + '</b>' +
      '<span>' + (p.numeros || []).length + ' pasta(s) · ' + esc(fmt.dtHoraBR(p.arquivadaEm || p.criadoEm)) + '</span></div>' +
      '<button type="button" class="ficha-arrow" data-acao="toggle" data-id="' + esc(p.id) + '" aria-label="Detalhes">' + ic.chevronDown + '</button>' +
      '</div>' +
      '<div class="row" style="margin-top:8px"><span class="chip">Arquivada</span><span class="chip pri">Concluída</span></div>' +
      (aberto
        ? '<div class="ficha-detail">' +
        '<div class="dates-label">Pastas</div>' +
        '<div class="dates-chips">' + (p.numeros || []).map(n =>
          '<span class="date-chip">Pasta ' + esc(n) + '</span>').join('') + '</div>' +
        '<div class="ficha-actions">' +
        '<button type="button" class="btn-xs pri" data-acao="ver-arq" data-id="' + esc(p.id) + '">' + ic.eye + 'Visualizar</button>' +
        '<button type="button" class="btn-xs" data-acao="pdf-arq" data-id="' + esc(p.id) + '">' + ic.download + 'PDF</button>' +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn-xs danger" data-acao="excluir-arq" data-id="' + esc(p.id) + '">' + ic.trash + '</button>' +
        '</div></div>'
        : '') +
      '</article>';
  }

  /* ---------------- Ações ---------------- */
  function onClick(e) {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const a = b.dataset.acao;
    const id = b.dataset.id;

    if (a === 'toggle') { e.stopPropagation(); toggle(id); return; }
    if (a === 'menu') { e.stopPropagation(); menuId = menuId === id ? null : id; render(); return; }
    if (a === 'filtrar') {
      filtro = b.dataset.filtro;
      render();
      setTimeout(() => { const el = $('#lista-ativas'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
      return;
    }
    if (a === 'limpar-filtro') { filtro = null; render(); return; }

    if (a === 'pegar') return mudarStatus(id, 'pegar');
    if (a === 'concluir') return mudarStatus(id, 'concluir');
    if (a === 'liberar') return mudarStatus(id, 'liberar');
    if (a === 'reabrir') return mudarStatus(id, 'reabrir');

    if (a === 'ver') return abrirFicha(id, false);
    if (a === 'pdf') return abrirFicha(id, true);
    if (a === 'excluir') return excluir(id);
    if (a === 'salvar-data') return salvarData(id);

    if (a === 'ver-arq') return abrirArq(id, false);
    if (a === 'pdf-arq') return abrirArq(id, true);
    if (a === 'excluir-arq') return excluirArq(id);
  }

  function pegarFicha(id) { return Data.faas().find(f => f.id === id); }

  function abrirFicha(id, baixar) {
    const f = pegarFicha(id);
    if (!f) return;
    const dados = {
      pacientes: [{ nome: f.paciente, datas: f.datas }],
      dataPedido: f.dataPedido,
      responsavel: f.donoNome || nomeUsuario(),
      fs: 14
    };
    if (baixar) FL.doc.baixar('faa', dados);
    else FL.doc.abrirFAA(dados);
  }

  function abrirArq(id, baixar) {
    const p = Data.provisorias().find(x => x.id === id);
    if (!p) return;
    const dados = { numeros: p.numeros, usuario: p.nomeUsuario, data: p.data, fs: 14 };
    if (baixar) FL.doc.baixar('prov', dados);
    else FL.doc.abrirPROV(dados);
  }

  async function mudarStatus(id, acao) {
    const mapa = { pegar: 'executando', concluir: 'concluido', liberar: 'pendente', reabrir: 'pendente' };
    const novo = mapa[acao];
    if (!novo) return;
    menuId = null;
    FL.store.update(d => {
      const f = d.faas.find(x => x.id === id);
      if (!f) return;
      const agora = new Date().toISOString();
      f.status = novo;
      if (novo === 'executando') {
        f.executor = f.executor || nomeUsuario();
        f.executorId = sess.uid;
        f.iniciadoEm = f.iniciadoEm || agora;
      } else if (novo === 'concluido') {
        f.concluidoEm = agora;
        f.executor = f.executor || nomeUsuario();
      } else {
        f.executor = ''; f.executorId = ''; f.iniciadoEm = ''; f.concluidoEm = '';
      }
    });
    render();
    if (acao === 'concluir') FL.toast('Ficha concluída! Ela desceu para as concluídas.');
    else if (acao === 'pegar') FL.toast('Você pegou esta ficha.');
    else if (acao === 'reabrir') FL.toast('Ficha reaberta.');
    else FL.toast('Ficha liberada.');
  }

  function salvarData(id) {
    const inp = document.querySelector('[data-data-id="' + id + '"]');
    if (!inp || !inp.value) return FL.toast('Escolha uma data.', { tipo: 'erro' });
    FL.store.update(d => {
      const f = d.faas.find(x => x.id === id);
      if (f) f.dataPedido = inp.value;
    });
    render();
    FL.toast('Data do pedido atualizada.');
  }

  async function excluir(id) {
    const ok = await FL.confirm('Excluir esta ficha FAA? Ela sai do dashboard e do histórico.', {
      ok: 'Excluir', danger: true, title: 'Excluir ficha'
    });
    if (!ok) return;
    FL.store.update(d => {
      const f = d.faas.find(x => x.id === id);
      d.faas = d.faas.filter(x => x.id !== id);
      if (f) {
        const restantes = d.faas.filter(x => x.lote === f.lote);
        if (!restantes.length) d.lotes = d.lotes.filter(l => l.id !== f.lote);
      }
    });
    abertos.delete(id);
    render();
    FL.toast('Ficha excluída.');
  }

  async function excluirArq(id) {
    const ok = await FL.confirm('Excluir esta provisória arquivada?', {
      ok: 'Excluir', danger: true, title: 'Excluir arquivado'
    });
    if (!ok) return;
    FL.store.update(d => { d.provisorias = d.provisorias.filter(p => p.id !== id); });
    abertos.delete(id);
    render();
    FL.toast('Arquivado excluído.');
  }

  function vazio(icone, titulo, texto) {
    return '<div class="empty"><div class="eico">' + (ic[icone] || ic.check) + '</div><b>' + esc(titulo) + '</b><p>' + esc(texto) + '</p></div>';
  }

  window.FluxoPages = window.FluxoPages || {};
  window.FluxoPages.dash = { render: render };
})();

/* =====================================================================
   FLUXO (site) · site.js
   Casca do site (mantém o visual da fluxo-web): barra lateral, cabeçalho,
   abas, sino de notificações, menu do usuário e migração dos dados antigos.
   ===================================================================== */
(function () {
  'use strict';
  const FL = window.FL;
  if (!FL) return;

  const $ = FL.$, $$ = FL.$$, esc = FL.esc, ic = FL.ic, fmt = FL.fmt;
  const db = FL.sb;
  window.db = db;

  const TITULOS = { dash: 'Dashboard', faa: 'FAAs (Datas)', same: 'Pastas / SAME', prov: 'Provisória' };
  let abaAtiva = 'dash';
  let shellFeito = false;
  const isPerfil = document.body.dataset.app === 'perfil';

  /* ---------------- Barra lateral ---------------- */
  function sidebarHTML() {
    if (isPerfil) {
      return '<div class="sidebar-brand" id="brand-topo" role="button" tabindex="0" title="Voltar ao topo">' +
        '<div class="sidebar-brand-icon">👤</div><span>My Profile</span></div>' +
        '<button class="nav-item active" data-view="perfil">' + ic.user + 'Meu Perfil</button>' +
        '<button class="nav-item" data-view="config">' + ic.settings + 'Configurações</button>' +
        '<button class="nav-item" data-view="pessoas">' + ic.users + 'Pessoas</button>' +
        '<div style="flex:1"></div>' +
        '<a class="nav-item" href="menu.html">' + ic.home + 'Menu Inicial</a>';
    }
    return '<div class="sidebar-brand" id="brand-topo" role="button" tabindex="0" title="Voltar ao topo">' +
      '<div class="sidebar-brand-icon">F</div><span>Fluxo</span>' +
      '<button type="button" class="nav-close" aria-label="Fechar menu" title="Fechar menu">' +
      '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>' +
      '</div>' +
      '<button class="nav-item active" data-aba="dash">' + ic.home + 'Dashboard</button>' +
      '<button class="nav-item" data-aba="faa">' + ic.faas + 'FAAs (Datas)</button>' +
      '<button class="nav-item" data-aba="same">' + ic.folder + 'Pastas / SAME</button>' +
      '<button class="nav-item" data-aba="prov">' + ic.archive + 'Provisória</button>' +
      '<div style="flex:1"></div>' +
      '<a class="nav-item" href="perfil.html">' + ic.user + 'My Profile</a>' +
      '<a class="nav-item" href="perfil.html#pessoas">' + ic.users + 'Pessoas Add</a>' +
      '<button class="nav-item" id="btn-instalar-app" style="display:none;color:var(--pri);">' + ic.download + 'Baixar App</button>';
  }

  /* ---------------- Cabeçalho ---------------- */
  function headerHTML(opts) {
    const p = FL.data.perfil();
    const s = FL.sessao.get(false) || {};
    const nome = p.nome || s.nome || 'Utilizador';
    const usuario = p.usuario || s.usuario || '';
    const foto = FL.avatar(p.foto, nome);
    return '<div style="display:flex;align-items:center;gap:12px;min-width:0;">' +
      (!isPerfil ? '<button type="button" class="hamb" id="btn-hamb" onclick="window.FluxoSite.abrirMenu()" aria-label="Abrir menu">' +
        '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>' : '') +
      '<div style="font-size:20px;font-weight:800;min-width:0;" id="page-header-title">' + esc(opts.title || '') + '</div>' +
      '</div>' +
      '<div class="header-right">' +
      '<button type="button" class="ib" id="btn-bell" aria-label="Notificações" title="Notificações">' + ic.bell +
      '<span class="bell-badge" id="bell-badge" hidden>0</span></button>' +
      '<div class="tema-seg" role="group" aria-label="Tema do site" data-tema-seg data-modo="auto">' +
      '<i class="tema-thumb"></i>' +
      '<button type="button" data-tema="light" title="Claro"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg></button>' +
      '<button type="button" data-tema="auto" title="Automático"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></button>' +
      '<button type="button" data-tema="dark" title="Escuro"><svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg></button>' +
      '</div>' +
      '<div class="user-menu" id="user-menu">' +
      '<button type="button" class="user-profile-area" id="user-btn" aria-haspopup="menu" aria-expanded="false" title="Perfil">' +
      '<img id="avatar" class="user-avatar-circle" alt="Foto de perfil">' +
      '<div class="user-info-text"><b id="user-display">' + esc(nome) + '</b><span id="user-role-badge">@' + esc(usuario) + '</span></div>' +
      '<svg class="user-caret" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>' +
      '</button>' +
      '<div class="user-dropdown" id="user-dropdown" role="menu">' +
      '<div class="ud-id"><img id="ud-avatar" class="user-avatar-circle" alt=""><div class="user-info-text"><b id="ud-nome">' + esc(nome) + '</b><span id="ud-user">@' + esc(usuario) + '</span></div></div>' +
      '<a href="perfil.html" class="ud-item" role="menuitem">' + ic.user + 'My Profile</a>' +
      '<a href="perfil.html#pessoas" class="ud-item" role="menuitem">' + ic.users + 'Pessoas Add</a>' +
      '<button type="button" class="ud-item perigo" role="menuitem" id="btn-sair">' + ic.logout + 'Sign Out</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  function setTitulo(t, sub) {
    const el = $('#page-header-title');
    if (!el) return;
    el.innerHTML = esc(t || '') + (sub ? '<span style="font-size:12px;color:var(--mut);font-weight:600;margin-left:10px">' + esc(sub) + '</span>' : '');
  }

  /* ---------------- Abas (menu) ---------------- */
  function mudarAba(aba) {
    abaAtiva = aba;
    $$('#site-sidebar [data-aba]').forEach(b => b.classList.toggle('active', b.dataset.aba === aba));
    ['dash', 'faa', 'same', 'prov'].forEach(a => {
      const el = $('#tab-' + a);
      if (el) el.classList.toggle('active', a === aba);
    });
    setTitulo(TITULOS[aba] || '');
    if (window.FluxoPages && window.FluxoPages[aba] && typeof window.FluxoPages[aba].render === 'function') {
      try { window.FluxoPages[aba].render(); } catch (e) { }
    }
    fecharMenu();
    const c = $('#content');
    if (c) c.scrollTop = 0;
  }

  function mudarSecaoPerfil(v) {
    if (window.FluxoPages && window.FluxoPages.perfil && typeof window.FluxoPages.perfil.mostrar === 'function') {
      window.FluxoPages.perfil.mostrar(v);
    }
  }

  /* ---------------- Menu lateral mobile ---------------- */
  function abrirMenu() { document.body.classList.add('nav-open'); }
  function fecharMenu() { document.body.classList.remove('nav-open'); }
  function voltarTopo() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const c = $('#content');
    if (c) c.scrollTo({ top: 0, behavior: 'smooth' });
    fecharMenu();
  }

  /* ---------------- Eventos ---------------- */
  let binded = false;
  function bindOnce() {
    if (binded) return;
    binded = true;

    const aside = $('#site-sidebar');
    if (aside) {
      aside.addEventListener('click', e => {
        const nav = e.target.closest('[data-aba], [data-view]');
        if (e.target.closest('.sidebar-brand')) return voltarTopo();
        if (!nav) return;
        if (nav.dataset.aba) mudarAba(nav.dataset.aba);
        else mudarSecaoPerfil(nav.dataset.view);
      });
    }

    const brand = $('#brand-topo');
    if (brand) brand.addEventListener('click', voltarTopo);

    const btnBell = $('#btn-bell');
    if (btnBell) btnBell.addEventListener('click', () => FL.abrirNotificacoes());

    // menu do usuário
    const userMenu = $('#user-menu');
    const userBtn = $('#user-btn');
    if (userBtn && userMenu) {
      userBtn.addEventListener('click', e => {
        e.stopPropagation();
        userMenu.classList.toggle('open');
      });
      document.addEventListener('click', e => {
        if (userMenu.classList.contains('open') && !userMenu.contains(e.target)) userMenu.classList.remove('open');
      });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') userMenu.classList.remove('open'); });
    }
    const btnSair = $('#btn-sair');
    if (btnSair) btnSair.addEventListener('click', () => { userMenu && userMenu.classList.remove('open'); FL.sair(); });

    // fundo da barra lateral no mobile
    const backdrop = document.querySelector('.nav-backdrop');
    if (backdrop) backdrop.addEventListener('click', fecharMenu);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1024) fecharMenu(); });

    // atalhos "ir para aba"
    document.addEventListener('click', e => {
      const ir = e.target.closest('[data-ir]');
      if (ir) { e.preventDefault(); mudarAba(ir.dataset.ir); }
    });

    // PWA
    let pwaPrompt = null;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      pwaPrompt = e;
      const b = $('#btn-instalar-app');
      if (b) b.style.display = 'flex';
    });
    document.addEventListener('click', async e => {
      if (!e.target.closest('#btn-instalar-app') || !pwaPrompt) return;
      pwaPrompt.prompt();
      const { outcome } = await pwaPrompt.userChoice;
      if (outcome === 'accepted') { const b = $('#btn-instalar-app'); if (b) b.style.display = 'none'; }
      pwaPrompt = null;
    });

    FL.atualizarSino();
    migrarAntigo();
    chatSiteIniciar();
  }

  /* ---------------- Casca ---------------- */
  function siteShell(opts) {
    const s = FL.sessao.get();
    if (!s) return null;
    if (!shellFeito) {
      shellFeito = true;
      const aside = $('#site-sidebar');
      const header = $('#site-header');
      if (aside) aside.innerHTML = sidebarHTML();
      if (header) header.innerHTML = headerHTML(opts);
      bindOnce();
      const img = $('#avatar');
      if (img) img.src = FL.avatar(FL.data.perfil().foto, FL.data.perfil().nome);
      if ($('#ud-avatar')) $('#ud-avatar').src = FL.avatar(FL.data.perfil().foto, FL.data.perfil().nome);
    }
    if (opts.page && opts.page !== 'perfil') {
      try { localStorage.setItem('fluxo_ultima_pagina', opts.page); } catch (e) { }
    }
    setTitulo(opts.title, opts.sub);
    return s;
  }

  function siteTopbar(opts) {
    setTitulo(opts.title, opts.sub);
  }

  FL.shell = siteShell;
  FL.topbar = siteTopbar;

  /* ---------------- Migração dos dados antigos (relatorio/listas) ---------------- */
  function dtDe(str) {
    const m = String(str || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    let y = +m[3]; if (y < 100) y += 2000;
    return y + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
  }

  async function migrarAntigo() {
    if (!FL.sessaoNuvem()) return;
    const d = FL.store.get();
    if (d.faas.length || d.lotes.length || d.pastas.length || d.provisorias.length) return;

    try {
      const r1 = await db.from('listas').select('dados').eq('categoria', 'app_v3').maybeSingle();
      if (r1.data && r1.data.dados && r1.data.dados._v === 3) {
        try {
          localStorage.setItem(FL.store.key(), JSON.stringify(Object.assign(FL.store.blank(), r1.data.dados)));
          window.FluxoPages && Object.keys(window.FluxoPages).forEach(k => {
            try { window.FluxoPages[k].render && window.FluxoPages[k].render(); } catch (e) { }
          });
        } catch (e) { }
        return;
      }
    } catch (e) { }

    try {
      const { data: rows, error } = await db.from('relatorio')
        .select('id,data,categoria,responsavel,descricao,detalhe,status,executor,iniciado_em,concluido_em')
        .limit(1500);
      if (error || !rows || !rows.length) return;

      const sess = FL.sessao.get(false);
      const perfil = FL.data.perfil();
      const faas = [], lotes = [], pastas = [], provs = [];

      rows.forEach(r => {
        const ts = new Date((r.data || fmt.hojeIso()) + 'T12:00:00').toISOString();
        const donoNome = r.responsavel || perfil.nome;

        if (r.categoria === 'faa') {
          const pacientes = String(r.detalhe || '').split(/\r?\n/).map(l => {
            l = l.trim();
            if (!l) return null;
            const m = l.match(/^(.*?)\s*[—–-]\s*([\d\/.,\s]+)$/);
            if (m) {
              const datas = (m[2].match(/\d{1,2}\/\d{1,2}\/\d{2,4}/g) || []).map(dtDe).filter(Boolean);
              return { nome: m[1].trim(), datas: datas };
            }
            return { nome: l, datas: [] };
          }).filter(p => p && p.nome);
          const lote = FL.novoId('lote');
          pacientes.forEach(p => {
            faas.push({
              id: FL.novoId('faa'), lote: lote, paciente: p.nome, datas: p.datas,
              dataPedido: r.data, status: r.status || 'pendente',
              executor: r.executor || '', executorId: '', iniciadoEm: r.iniciado_em || '', concluidoEm: r.concluido_em || '',
              criadoEm: ts, dono: sess.uid, donoNome: donoNome
            });
          });
          lotes.push({ id: lote, criadoEm: ts, dataPedido: r.data, pacientes: pacientes, qtd: pacientes.length, dono: sess.uid, donoNome: donoNome });
        } else if (r.categoria === 'same') {
          const itens = String(r.detalhe || '').split(/\r?\n/).map(l => {
            l = l.trim();
            if (!l) return null;
            const m = l.match(/^(?:SAME\s+)?(\d{1,8})\s*[—–-]\s*(.+)$/);
            if (m) return { same: m[1], nome: m[2].trim() };
            const m2 = l.match(/^(\d{1,8})$/);
            if (m2) return { same: m2[1], nome: '' };
            return null;
          }).filter(Boolean);
          if (itens.length) {
            pastas.push({ id: FL.novoId('pasta'), criadoEm: ts, data: r.data, usuario: sess.usuario, nomeUsuario: donoNome, itens: itens });
          }
        } else if (r.categoria === 'prov') {
          const numeros = (String(r.detalhe || '').match(/Pasta\s+(\d+)/g) || []).map(x => x.replace(/\D/g, ''));
          if (numeros.length) {
            provs.push({
              id: FL.novoId('prov'), criadoEm: ts, data: r.data, usuario: sess.usuario, nomeUsuario: donoNome,
              numeros: numeros, arquivada: true, arquivadaEm: r.concluido_em || ts
            });
          }
        }
      });

      const novo = FL.store.get();
      novo.faas = faas;
      novo.lotes = lotes;
      novo.pastas = pastas;
      novo.provisorias = provs;
      FL.store.set(novo);

      if (faas.length || lotes.length || pastas.length || provs.length) {
        FL.toast('Dados antigos do Fluxo foram importados para o novo painel.');
        setTimeout(() => {
          window.FluxoPages && Object.keys(window.FluxoPages).forEach(k => {
            try { window.FluxoPages[k].render && window.FluxoPages[k].render(); } catch (e) { }
          });
        }, 300);
      }
    } catch (e) { }
  }

  /* ---------------- Chat flutuante (o mesmo de antes) ---------------- */
  const CHAT = { aberto: false, conversas: [], atual: null, msgs: [], pendentes: [], naoLidas: 0, pronto: false, sigLista: '', sigMsgs: '', erro: '', timer: null, canal: null, tick: 0, base: '' };
  const chatHora = ts => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const chatCurta = ts => {
    const d = new Date(ts);
    return d.toDateString() === new Date().toDateString() ? chatHora(ts) : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };
  const chatDia = ts => {
    const d = new Date(ts), h = new Date(), ontem = new Date();
    ontem.setDate(h.getDate() - 1);
    if (d.toDateString() === h.toDateString()) return 'Hoje';
    if (d.toDateString() === ontem.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR');
  };
  const chatNome = c => c.nome || c.usuario;
  const chatAvatar = c => '<span class="chat-av"><img src="' + esc(c.foto || FL.avatarPadrao(c.nome || c.usuario)) + '" alt="">' +
    '<i class="chat-on" ' + (c.online ? '' : 'hidden') + '></i></span>';

  function chatBadge() {
    const n = CHAT.naoLidas, b = $('#chat-badge');
    if (!b) return;
    b.style.display = n ? '' : 'none';
    b.textContent = n > 99 ? '99+' : n;
    $('#chat-fab').classList.toggle('tem-nova', n > 0 && !CHAT.aberto);
  }

  function chatSiteIniciar() {
    if (!db || !FL.sessaoNuvem() || !$('#chat-fab')) return;
    chatParar();
    CHAT.base = document.title.replace(/^\(\d+\)\s*/, '');
    chatCarregarConversas();
    CHAT.timer = setInterval(chatTick, 4000);
    try {
      const s = FL.sessao.get(false);
      CHAT.canal = db.channel('chat-' + s.uid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: 'destinatario_id=eq.' + s.uid }, () => {
        chatCarregarConversas();
        if (CHAT.aberto && CHAT.atual) chatCarregarMsgs(false);
      }).subscribe();
    } catch (e) { }
  }

  function chatParar() {
    clearInterval(CHAT.timer);
    CHAT.timer = null;
    if (CHAT.canal) { try { db.removeChannel(CHAT.canal); } catch (e) { } CHAT.canal = null; }
    Object.assign(CHAT, { aberto: false, conversas: [], atual: null, msgs: [], pendentes: [], naoLidas: 0, pronto: false, sigLista: '', sigMsgs: '', erro: '', tick: 0 });
    const p = $('#chat-panel');
    if (p) p.hidden = true;
    const r = $('#chat-root');
    if (r) r.classList.remove('aberto');
  }

  function chatTick() {
    CHAT.tick++;
    if (document.hidden && CHAT.tick % 5) return;
    if (!CHAT.aberto) { if (CHAT.tick % 4 === 0) chatCarregarConversas(); return; }
    chatCarregarConversas();
    if (CHAT.atual) chatCarregarMsgs(false);
  }

  function chatAlternar() {
    CHAT.aberto = !CHAT.aberto;
    const p = $('#chat-panel'), r = $('#chat-root'), f = $('#chat-fab');
    if (p) p.hidden = !CHAT.aberto;
    if (r) r.classList.toggle('aberto', CHAT.aberto);
    if (f) f.classList.remove('tem-nova');
    if (!CHAT.aberto) { chatBadge(); return; }
    chatCarregarConversas();
    if (CHAT.atual) { chatCarregarMsgs(true); setTimeout(() => $('#chat-texto').focus(), 50); }
    else chatRenderLista();
  }

  async function chatCarregarConversas() {
    if (!db) return;
    const { data, error } = await db.rpc('listar_conversas');
    if (error) { CHAT.erro = error.message; if (CHAT.aberto && !CHAT.atual) chatRenderLista(); return; }
    CHAT.erro = '';
    const lista = data || [], antes = {};
    CHAT.conversas.forEach(c => { antes[c.usuario] = c.nao_lidas || 0; });
    const total = lista.reduce((s, c) => s + (c.nao_lidas || 0), 0);
    if (CHAT.pronto) {
      const nova = lista.find(c => (c.nao_lidas || 0) > (antes[c.usuario] || 0) && !(CHAT.aberto && CHAT.atual && CHAT.atual.usuario === c.usuario));
      if (nova) FL.toast('💬 Nova mensagem de ' + chatNome(nova));
    }
    CHAT.pronto = true;
    CHAT.naoLidas = total;
    CHAT.conversas = lista;
    if (CHAT.atual) {
      const c = lista.find(x => x.usuario === CHAT.atual.usuario);
      if (c) CHAT.atual = c;
    }
    chatBadge();
    const sig = JSON.stringify(lista.map(c => [c.usuario, c.nome, c.ultimo_em, c.nao_lidas, c.online]));
    if (sig !== CHAT.sigLista) { CHAT.sigLista = sig; if (CHAT.aberto && !CHAT.atual) chatRenderLista(); }
  }

  function chatMostrarLista() {
    const l = $('#chat-lista'), c = $('#chat-conv'), v = $('#chat-voltar');
    if (l) l.style.display = '';
    if (c) c.style.display = 'none';
    if (v) v.style.display = 'none';
    if ($('#chat-titulo')) $('#chat-titulo').textContent = 'Mensagens';
  }

  function chatRenderLista() {
    const box = $('#chat-lista');
    if (!box) return;
    if (CHAT.erro) { box.innerHTML = '<div class="chat-vazio">Mensagens indisponíveis agora.<br><small>' + esc(CHAT.erro) + '</small></div>'; return; }
    if (!CHAT.conversas.length) { box.innerHTML = '<div class="chat-vazio">Você ainda não tem pessoas para conversar.<br>Em My Profile &gt; Pessoas Add, adicione alguém.</div>'; return; }
    box.innerHTML = CHAT.conversas.map(c =>
      '<button type="button" class="chat-item" data-u="' + esc(c.usuario) + '">' +
      chatAvatar(c) +
      '<span class="chat-meta"><b>' + esc(chatNome(c)) + '</b><small>' + (c.ultimo_texto ? (c.ultimo_meu ? 'Você: ' : '') + esc(c.ultimo_texto) : '@' + esc(c.usuario)) + '</small></span>' +
      '<span class="chat-dir">' + (c.ultimo_em ? '<small>' + chatCurta(c.ultimo_em) + '</small>' : '') + (c.nao_lidas ? '<em class="chat-nl">' + (c.nao_lidas > 99 ? '99+' : c.nao_lidas) + '</em>' : '') + '</span>' +
      '</button>').join('');
  }

  function chatAbrirConversa(usuario) {
    const c = CHAT.conversas.find(x => x.usuario === usuario);
    if (!c) return;
    CHAT.atual = c;
    CHAT.msgs = [];
    CHAT.pendentes = [];
    CHAT.sigMsgs = '';
    const l = $('#chat-lista'), cv = $('#chat-conv'), v = $('#chat-voltar');
    if (l) l.style.display = 'none';
    if (cv) cv.style.display = 'flex';
    if (v) v.style.display = '';
    chatTituloConversa();
    const m = $('#chat-msgs');
    if (m) m.innerHTML = '<div class="chat-vazio">A carregar...</div>';
    chatCarregarMsgs(true);
    setTimeout(() => $('#chat-texto').focus(), 50);
  }

  function chatTituloConversa() {
    const c = CHAT.atual;
    if (!c || !$('#chat-titulo')) return;
    $('#chat-titulo').innerHTML = chatAvatar(c) + '<span class="tt"><b>' + esc(chatNome(c)) + '</b><small>@' + esc(c.usuario) + ' · ' + (c.online ? 'online' : 'offline') + '</small></span>';
  }

  function chatVoltar() {
    CHAT.atual = null;
    CHAT.msgs = [];
    CHAT.pendentes = [];
    chatMostrarLista();
    chatRenderLista();
    chatCarregarConversas();
  }

  async function chatCarregarMsgs(forcar) {
    const c = CHAT.atual;
    if (!c || !db) return;
    const { data, error } = await db.rpc('listar_mensagens', { p_usuario: c.usuario, p_limite: 150 });
    if (CHAT.atual !== c && !(CHAT.atual && CHAT.atual.usuario === c.usuario)) return;
    if (error) {
      const m = $('#chat-msgs');
      if (m) m.innerHTML = '<div class="chat-vazio">Não foi possível carregar.<br><small>' + esc(error.message) + '</small></div>';
      return;
    }
    const msgs = data || [], sig = msgs.length + ':' + (msgs.length ? msgs[msgs.length - 1].id : 0);
    if (forcar || sig !== CHAT.sigMsgs) { CHAT.msgs = msgs; CHAT.sigMsgs = sig; chatRenderMsgs(!!forcar); }
    if (msgs.some(m => !m.minha && !m.lida_em)) {
      await db.rpc('marcar_lidas', { p_usuario: c.usuario });
      chatCarregarConversas();
    }
  }

  function chatRenderMsgs(rolar) {
    const el = $('#chat-msgs');
    if (!el) return;
    const perto = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
    const todas = CHAT.msgs.concat(CHAT.pendentes);
    if (!todas.length) { el.innerHTML = '<div class="chat-vazio">Nenhuma mensagem ainda.<br>Diga olá! 👋</div>'; return; }
    let dia = '', html = '';
    todas.forEach(m => {
      const d = chatDia(m.criado_em);
      if (d !== dia) { dia = d; html += '<div class="chat-dia">' + esc(d) + '</div>'; }
      html += '<div class="chat-bolha ' + (m.minha ? 'eu' : 'ele') + (m.pendente ? ' pend' : '') + '">' + esc(m.texto) +
        '<span class="hr">' + (m.pendente ? 'a enviar...' : chatHora(m.criado_em)) + '</span></div>';
    });
    el.innerHTML = html;
    if (rolar || perto) el.scrollTop = el.scrollHeight;
  }

  async function chatEnviar() {
    const c = CHAT.atual, ta = $('#chat-texto'), t = ta.value.trim();
    if (!c || !t || !db) return;
    ta.value = '';
    const temp = { minha: true, texto: t, criado_em: new Date().toISOString(), pendente: true };
    CHAT.pendentes.push(temp);
    chatRenderMsgs(true);
    const { data, error } = await db.rpc('enviar_mensagem', { p_usuario: c.usuario, p_texto: t });
    if (error || data !== 'ok') {
      CHAT.pendentes = CHAT.pendentes.filter(x => x !== temp);
      chatRenderMsgs(true);
      ta.value = t;
      FL.toast(error ? 'Erro ao enviar: ' + error.message : 'Não foi possível enviar.', { tipo: 'erro' });
      return;
    }
    await chatCarregarMsgs(true);
    CHAT.pendentes = CHAT.pendentes.filter(x => x !== temp);
    chatRenderMsgs(true);
    chatCarregarConversas();
  }

  function chatAutoAltura() {
    const ta = $('#chat-texto');
    ta.style.height = '40px';
    ta.style.height = Math.min(ta.scrollHeight, 110) + 'px';
  }

  function bindChat() {
    const fab = $('#chat-fab');
    if (fab) fab.addEventListener('click', chatAlternar);
    const root = $('#chat-root');
    if (!root) return;
    root.querySelectorAll('[data-chat-close], .chat-ib[onclick]').forEach(() => { });
    const fechar = root.querySelector('.chat-head .chat-ib:last-child');
    if (fechar) fechar.addEventListener('click', chatAlternar);
    const voltar = $('#chat-voltar');
    if (voltar) voltar.addEventListener('click', chatVoltar);
    const lista = $('#chat-lista');
    if (lista) lista.addEventListener('click', e => {
      const b = e.target.closest('[data-u]');
      if (b) chatAbrirConversa(b.dataset.u);
    });
    const texto = $('#chat-texto');
    if (texto) {
      texto.addEventListener('input', chatAutoAltura);
      texto.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); chatEnviar(); }
      });
    }
    const enviar = root.querySelector('.chat-enviar');
    if (enviar) enviar.addEventListener('click', chatEnviar);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && CHAT.aberto) chatAlternar(); });
  }
  document.addEventListener('DOMContentLoaded', bindChat);

  /* ---------------- Exposição ---------------- */
  window.FluxoSite = { mudarAba: mudarAba, abrirMenu: abrirMenu, fecharMenu: fecharMenu };
  window.FluxoPages = window.FluxoPages || {};
})();

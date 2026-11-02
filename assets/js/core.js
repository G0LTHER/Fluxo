/* =====================================================================
   FLUXO · core.js
   Sessão, banco local + Supabase, casca do app (topo/barra inferior),
   notificações, chat e dados compartilhados.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------------- 0. Utilidades ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const LS = window.localStorage;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const key = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const pad = n => String(n).padStart(2, '0');
  const novoId = p => (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const MODO_DEMO = true; // deixe false para esconder o atalho de demonstração
  const LIMITE_INATIVIDADE = 30 * 60 * 1000; // 30 minutos

  /* ---------------- 1. Ícones ---------------- */
  const svg = p => '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>';
  const ic = {
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'),
    faas: svg('<rect x="8" y="2.5" width="8" height="4" rx="1.4"/><path d="M16 4.5h2.5A1.5 1.5 0 0 1 20 6v13.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5V6a1.5 1.5 0 0 1 1.5-1.5H8"/><path d="M8.5 11.5h7M8.5 15.5h4.5"/>'),
    home: svg('<path d="M4 10.4 12 4l8 6.4V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9.5 21v-6h5v6"/>'),
    folder: svg('<path d="M3 7.6A2.6 2.6 0 0 1 5.6 5h3.1c.7 0 1.3.25 1.8.7l.9.9c.35.33.8.5 1.3.5h5.7A2.6 2.6 0 0 1 21 9.7v7.7A2.6 2.6 0 0 1 18.4 20H5.6A2.6 2.6 0 0 1 3 17.4z"/>'),
    archive: svg('<rect x="3" y="4" width="18" height="4.4" rx="1.5"/><path d="M5 8.4V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.4"/><path d="M10 12.6h4"/>'),
    bell: svg('<path d="M18 8.6a6 6 0 1 0-12 0c0 6-2.4 7.4-2.4 7.4h16.8S18 14.6 18 8.6"/><path d="M13.7 19.4a2 2 0 0 1-3.4 0"/>'),
    camera: svg('<path d="M4 8.6h2.4L8 6.4h8l1.6 2.2H20a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.6a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.4" r="3.4"/>'),
    arrowLeft: svg('<path d="M15 5l-7 7 7 7"/>'),
    arrowRight: svg('<path d="M9 5l7 7-7 7"/>'),
    chevronDown: svg('<path d="M6 9.5l6 6 6-6"/>'),
    chevronRight: svg('<path d="M9 5l7 7-7 7"/>'),
    download: svg('<path d="M12 4v10"/><path d="M8 11l4 4 4-4"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/>'),
    upload: svg('<path d="M12 16V6"/><path d="M8 9l4-4 4 4"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/>'),
    eye: svg('<path d="M2 12s3.6-6.4 10-6.4S22 12 22 12s-3.6 6.4-10 6.4S2 12 2 12z"/><circle cx="12" cy="12" r="2.9"/>'),
    eyeOff: svg('<path d="M17.9 17.9A10.6 10.6 0 0 1 12 18.4C5.6 18.4 2 12 2 12a18 18 0 0 1 5-5.7M9.9 4.4A10.5 10.5 0 0 1 12 5.6c6.4 0 10 6.4 10 6.4a18.4 18.4 0 0 1-2.1 3.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M2 2l20 20"/>'),
    trash: svg('<path d="M4 7h16"/><path d="M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/><path d="M6.5 7l.9 12.1a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9L17.5 7"/><path d="M10.5 11v5.5M13.5 11v5.5"/>'),
    chat: svg('<path d="M21 11.8a8.4 8.4 0 0 1-12.3 7.5L4 20.8l1.5-4.6a8.4 8.4 0 1 1 15.5-4.4z"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 14.9a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    users: svg('<path d="M16 20.5v-1.6a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4v1.6"/><circle cx="9.2" cy="7.5" r="3.6"/><path d="M21.5 20.5v-1.6a4 4 0 0 0-3-3.86"/><path d="M15.8 4.06a4 4 0 0 1 0 7.75"/>'),
    palette: svg('<circle cx="12" cy="12" r="9"/><circle cx="8.6" cy="9.4" r="1.2"/><circle cx="12" cy="7.6" r="1.2"/><circle cx="15.4" cy="9.4" r="1.2"/><path d="M12 21a2.2 2.2 0 0 0 0-4.4h-.9a2.6 2.6 0 0 1 0-5.2"/>'),
    logout: svg('<path d="M9.5 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.5"/><path d="M16 16.5l4.5-4.5L16 7.5"/><path d="M20.5 12H9"/>'),
    calendar: svg('<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10.5h18"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    key: svg('<circle cx="8.5" cy="15" r="4.2"/><path d="M11.5 12 20.5 3"/><path d="M17 6.5 20 9.5"/><path d="M14 9.5 17 12.5"/>'),
    check: svg('<path d="M20 6.5 9.5 17 4 11.5"/>'),
    printer: svg('<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7.4" rx="2"/><path d="M7 16.4h10V21H7z"/>'),
    send: svg('<path d="M21 3 3 10.4l6.8 3.4L13.2 21z"/><path d="M9.8 13.8 21 3"/>'),
    x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.4V12l3.2 2"/>'),
    alert: svg('<path d="M10.3 4.2 2.6 17.5a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.4v4.2M12 17h.01"/>'),
    sparkles: svg('<path d="M11.5 3.5 13.2 8l4.5 1.7-4.5 1.7-1.7 4.5-1.7-4.5L5.3 9.7 9.8 8z"/><path d="M18 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
    lock: svg('<rect x="4.5" y="10" width="15" height="11" rx="2.6"/><path d="M8.2 10V7.4a3.8 3.8 0 0 1 7.6 0V10"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.6 7 12 13l8.4-6"/>'),
    image: svg('<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.6" cy="9.6" r="1.7"/><path d="M21 16.2 15.8 11 7 19.5"/>'),
    file: svg('<path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M13.5 3v5.5H19"/>'),
    wave: svg('<path d="M2.5 15.5c3.6 0 4.4-8 8-8s4 5.5 7.5 5.5c1.6 0 2.6-.7 3.5-1.6"/><path d="M2.5 19.5c3.6 0 4.4-8 8-8s4 5.5 7.5 5.5c1.6 0 2.6-.7 3.5-1.6" opacity=".45"/>'),
    copy: svg('<rect x="8.5" y="8.5" width="12" height="12" rx="2.4"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H5.5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2H8"/>'),
    refresh: svg('<path d="M20.5 11.5a8.5 8.5 0 1 0-2.6 6"/><path d="M20.5 4.5v7h-7"/>')
  };

  /* ---------------- 2. Tema ---------------- */
  const Theme = {
    get() { try { return LS.getItem('fluxo_tema') || 'auto'; } catch (e) { return 'auto'; } },
    apply() {
      const m = this.get();
      const dark = m === 'dark' || (m === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#0a1120' : '#0d9488');
      $$('[data-tema-seg]').forEach(g => {
        g.setAttribute('data-modo', m);
        $$('button', g).forEach(b => {
          const on = b.getAttribute('data-tema') === m;
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.classList.toggle('on', on);
        });
      });
    },
    set(m) {
      try { LS.setItem('fluxo_tema', m); } catch (e) { }
      this.apply();
    }
  };

  /* ---------------- 3. Contas locais (modo offline) ---------------- */
  const AUTH_KEY = 'fluxo_contas_v3';
  function lerContas() {
    try { const o = JSON.parse(LS.getItem(AUTH_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
  }
  function gravarContas(o) { try { LS.setItem(AUTH_KEY, JSON.stringify(o)); } catch (e) { } }
  // Hash local simples (somente para o modo offline/demonstração; as contas
  // reais no Supabase usam o Auth do Supabase).
  function hashSenha(usuario, senha) {
    const s = String(usuario).toLowerCase() + '::' + String(senha) + '::fluxo.v3';
    let h1 = 0x811c9dc5 >>> 0, h2 = 0x9e3779b9 >>> 0;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
      h2 = Math.imul(h2 + c + i, 2246822519) >>> 0;
    }
    return ('0000000' + h1.toString(16)).slice(-8) + ('0000000' + h2.toString(16)).slice(-8);
  }
  function normalizarUsuario(u) {
    return key(String(u || '').replace(/^@/, '').split('@')[0]).replace(/[^a-z0-9._-]/g, '').slice(0, 30);
  }

  /* ---------------- 4. Sessão ---------------- */
  const SESS_KEY = 'fluxo_sessao_v3';
  const Sessao = {
    get(checar) {
      let s = null;
      try { s = JSON.parse(LS.getItem(SESS_KEY) || 'null'); } catch (e) { s = null; }
      if (!s || !s.uid) return null;
      if (checar !== false && s.manter !== true) {
        const ultimo = s.ultimaAtividade || s.criadoEm || 0;
        if (Date.now() - ultimo > LIMITE_INATIVIDADE) { this.clear(); return null; }
      }
      return s;
    },
    raw() { try { return JSON.parse(LS.getItem(SESS_KEY) || 'null'); } catch (e) { return null; } },
    set(s) { try { LS.setItem(SESS_KEY, JSON.stringify(s)); } catch (e) { } },
    patch(o) { const s = this.raw(); if (!s) return null; Object.assign(s, o); this.set(s); return s; },
    touch() {
      const s = this.raw(); if (!s) return;
      const agora = Date.now();
      if (agora - (s.ultimaAtividade || 0) < 8000) return;
      s.ultimaAtividade = agora;
      try { LS.setItem(SESS_KEY, JSON.stringify(s)); } catch (e) { }
    },
    clear() { try { LS.removeItem(SESS_KEY); } catch (e) { } },
    criar(dados) {
      const s = {
        uid: dados.uid,
        usuario: dados.usuario,
        nome: dados.nome || dados.usuario,
        email: dados.email || '',
        foto: dados.foto || '',
        manter: dados.manter === true,
        sb: dados.sb === true,
        criadoEm: Date.now(),
        ultimaAtividade: Date.now()
      };
      this.set(s);
      return s;
    }
  };

  /* ---------------- 5. Banco local (fonte da verdade) ---------------- */
  const DKEY = 'fluxo_data_v3::';
  const Store = {
    blank() {
      return {
        _v: 3,
        perfil: {},
        pessoas: [],
        faas: [],
        lotes: [],
        pastas: [],
        provisorias: [],
        chat: {},
        meta: { criadoEm: Date.now() }
      };
    },
    key() { const s = Sessao.get(false); return DKEY + (s ? s.uid : 'anon'); },
    get() {
      let d = null;
      try { d = JSON.parse(LS.getItem(this.key()) || 'null'); } catch (e) { d = null; }
      if (!d || typeof d !== 'object') d = this.blank();
      d._v = 3;
      d.perfil = d.perfil || {};
      d.pessoas = d.pessoas || [];
      d.faas = d.faas || [];
      d.lotes = d.lotes || [];
      d.pastas = d.pastas || [];
      d.provisorias = d.provisorias || [];
      d.chat = d.chat || {};
      d.meta = d.meta || {};
      return d;
    },
    set(d) {
      try { LS.setItem(this.key(), JSON.stringify(d)); }
      catch (e) { toast('Sem espaço no aparelho para guardar mais dados.', { tipo: 'erro' }); }
      Remote.push(d);
    },
    update(fn) {
      const d = this.get();
      const r = fn(d);
      this.set(d);
      return r === undefined ? d : r;
    }
  };

  /* ---------------- 6. Datas / status ---------------- */
  const hojeIso = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const isoDe = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseIso = iso => { const p = String(iso || '').slice(0, 10).split('-').map(Number); return new Date(p[0] || 1970, (p[1] || 1) - 1, p[2] || 1); };
  const somaDias = (iso, n) => { const d = parseIso(iso); d.setDate(d.getDate() + n); return isoDe(d); };
  const diasEntre = (a, b) => Math.round((parseIso(b) - parseIso(a)) / 86400000);
  const dtBR = iso => { if (!iso) return '—'; const p = String(iso).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso); };
  const dtHoraBR = ts => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  const horaCurta = ts => {
    if (!ts) return '';
    const d = new Date(ts), hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const PRAZO = 20;
  const ALERTA = 10;
  const ST = {
    pendente: { rot: 'Pendente', curto: 'Pendente', cor: 'amarela' },
    executando: { rot: 'Executando', curto: 'Executando', cor: 'amarela' },
    atrasado: { rot: 'Atrasado', curto: 'Atrasado', cor: 'vermelha' },
    concluido: { rot: 'Concluído', curto: 'Concluído', cor: 'azul' }
  };
  function statusDe(f) {
    if (!f) return 'pendente';
    if (f.status === 'concluido') return 'concluido';
    const d = diasEntre(f.dataPedido, hojeIso());
    if (d > PRAZO) return 'atrasado';
    return f.status === 'executando' ? 'executando' : 'pendente';
  }
  const vencimentoDe = f => somaDias(f.dataPedido, PRAZO);
  const diasRestantes = f => PRAZO - diasEntre(f.dataPedido, hojeIso());
  function emAlerta(f) {
    if (!f || f.status === 'concluido') return false;
    const d = diasEntre(f.dataPedido, hojeIso());
    return d <= PRAZO && (PRAZO - d) <= ALERTA && d >= 0;
  }
  function progressoDe(f) {
    const fim = f.status === 'concluido' && f.concluidoEm ? isoDe(new Date(f.concluidoEm)) : hojeIso();
    const usados = Math.max(0, diasEntre(f.dataPedido, fim));
    const pct = Math.min(100, Math.round(usados / PRAZO * 100));
    const restam = diasRestantes(f);
    return {
      usados: Math.min(usados, PRAZO),
      pct,
      restam,
      texto: f.status === 'concluido'
        ? 'Concluído'
        : restam < 0 ? 'Atrasado há ' + (-restam) + ' dia(s)'
          : restam === 0 ? 'Vence hoje'
            : 'Faltam ' + restam + ' dia(s)',
      dias: f.status === 'concluido' ? PRAZO : Math.max(0, Math.min(PRAZO, diasEntre(f.dataPedido, hojeIso())))
    };
  }

  /* ---------------- 7. Dados ---------------- */
  const Data = {
    get() { return Store.get(); },
    perfil() {
      const s = Sessao.get(false) || {};
      const d = Store.get();
      const p = d.perfil || {};
      return {
        nome: p.nome || s.nome || s.usuario || 'Utilizador',
        usuario: p.usuario || s.usuario || '',
        email: p.email || s.email || '',
        foto: p.foto || s.foto || ''
      };
    },
    salvarPerfil(p) {
      Store.update(s => { s.perfil = Object.assign(s.perfil || {}, p); });
      const cur = Sessao.raw();
      if (cur) Sessao.patch({
        nome: p.nome != null ? p.nome : cur.nome,
        usuario: p.usuario != null ? p.usuario : cur.usuario,
        email: p.email != null ? p.email : cur.email,
        foto: p.foto != null ? p.foto : cur.foto
      });
      Remote.salvarPerfil(p);
    },
    faas() { return Store.get().faas || []; },
    faasAtivas() {
      const ordem = { atrasado: 0, executando: 1, pendente: 2 };
      return (Store.get().faas || [])
        .filter(f => f.status !== 'concluido')
        .sort((a, b) => {
          const sa = statusDe(a), sb = statusDe(b);
          if (ordem[sa] !== ordem[sb]) return ordem[sa] - ordem[sb];
          return String(a.dataPedido).localeCompare(String(b.dataPedido)) || (a.id > b.id ? 1 : -1);
        });
    },
    faasConcluidas() {
      return (Store.get().faas || [])
        .filter(f => f.status === 'concluido')
        .sort((a, b) => String(b.concluidoEm || '').localeCompare(String(a.concluidoEm || '')) || (a.id > b.id ? 1 : -1));
    },
    atrasadas() { return (Store.get().faas || []).filter(f => statusDe(f) === 'atrasado'); },
    aVencer() { return (Store.get().faas || []).filter(emAlerta); },
    lotes() { return (Store.get().lotes || []).slice().sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm))); },
    pastas() { return (Store.get().pastas || []).slice().sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm))); },
    provisorias() { return (Store.get().provisorias || []).slice().sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm))); },
    arquivados() {
      return (Store.get().provisorias || [])
        .filter(p => p.arquivada)
        .sort((a, b) => String(b.arquivadaEm || b.criadoEm).localeCompare(String(a.arquivadaEm || a.criadoEm)));
    },
    pessoas() { return (Store.get().pessoas || []).slice(); },
    addPessoa(p) {
      const usuario = normalizarUsuario(p.usuario);
      if (!usuario) return { ok: false, erro: 'Informe um @ válido.' };
      const d = Store.get();
      if (usuario === normalizarUsuario(d.perfil.usuario || (Sessao.get(false) || {}).usuario)) return { ok: false, erro: 'Você não precisa se adicionar.' };
      if (d.pessoas.some(x => x.usuario === usuario)) return { ok: false, erro: '@' + usuario + ' já está na sua lista.' };
      d.pessoas.push({ usuario: usuario, nome: p.nome || usuario, foto: p.foto || '', online: !!p.online, desde: Date.now() });
      Store.set(d);
      return { ok: true };
    },
    removerPessoa(usuario) {
      Store.update(d => { d.pessoas = d.pessoas.filter(p => p.usuario !== usuario); });
    }
  };

  /* ---------------- 8. Supabase (opcional / melhor esforço) ---------------- */
  const SB_URL = 'https://xsgblgkzeiaxirquvpai.supabase.co';
  const SB_KEY = 'sb_publishable_yWYJb5jYgn1aBbng1-rr3w_JyHba3YC';
  let sb = null;
  try {
    if (window.supabase && window.supabase.createClient) sb = window.supabase.createClient(SB_URL, SB_KEY);
  } catch (e) { sb = null; }

  function sessaoNuvem() { const s = Sessao.get(false); return !!(sb && s && s.sb); }

  const Remote = {
    t: null,
    push(d) {
      if (!sessaoNuvem()) return;
      clearTimeout(this.t);
      this.t = setTimeout(() => this.enviar(d), 1600);
    },
    async enviar(d) {
      if (!sessaoNuvem()) return;
      const s = Sessao.get(false);
      try {
        await sb.from('listas').upsert(
          { user_id: s.uid, categoria: 'app_v3', texto: '', dados: d, atualizado_em: new Date().toISOString() },
          { onConflict: 'user_id,categoria' }
        );
      } catch (e) { }
    },
    async puxar() {
      if (!sessaoNuvem()) return;
      try {
        const { data } = await sb.from('listas').select('dados').eq('categoria', 'app_v3').maybeSingle();
        const rem = data && data.dados;
        if (!rem || rem._v !== 3) return;
        const local = Store.get();
        const vazio = !local.faas.length && !local.lotes.length && !local.pastas.length && !local.provisorias.length;
        if (vazio) {
          const d = Object.assign(Store.blank(), rem);
          d.perfil = Object.assign({}, d.perfil, local.perfil || {});
          try { LS.setItem(Store.key(), JSON.stringify(d)); } catch (e) { }
        }
      } catch (e) { }
    },
    async salvarPerfil(p) {
      if (!sessaoNuvem()) return;
      const s = Sessao.get(false);
      try {
        await sb.from('perfis').upsert({
          user_id: s.uid,
          usuario: p.usuario || s.usuario,
          nome: p.nome || s.nome,
          foto: p.foto || '',
          email_contato: p.email || s.email
        }, { onConflict: 'user_id' });
      } catch (e) { }
    },
    async ping() {
      if (!sessaoNuvem()) return;
      try { await sb.rpc('marcar_presenca'); } catch (e) { }
    }
  };

  /* ---------------- 9. Avisos / folhas / confirmação ---------------- */
  let tToast = null;
  function toast(msg, opt) {
    const o = opt || {};
    const host = document.getElementById('phone') || document.body;
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      if (host === document.body) el.style.position = 'fixed';
      host.appendChild(el);
    }
    el.className = 'toast' + (o.tipo === 'erro' ? ' erro' : '');
    el.innerHTML = (o.tipo === 'erro' ? ic.alert : ic.check) + '<span>' + esc(msg) + '</span>';
    requestAnimationFrame(() => el.classList.add('on'));
    clearTimeout(tToast);
    tToast = setTimeout(() => el.classList.remove('on'), o.tempo || 3200);
  }

  function sheet(opts) {
    const o = opts || {};
    const host = document.getElementById('phone') || document.body;
    const layer = document.createElement('div');
    layer.className = 'sheet-layer';
    layer.innerHTML =
      '<div class="sheet-backdrop"></div>' +
      '<div class="sheet ' + (o.cls || '') + '" role="dialog" aria-modal="true">' +
      '<div class="sheet-grip"></div>' +
      (o.title ? '<div class="sheet-head"><div><b>' + esc(o.title) + '</b>' + (o.sub ? '<span>' + esc(o.sub) + '</span>' : '') + '</div><button class="ib sm" data-close aria-label="Fechar">' + ic.x + '</button></div>' : '') +
      '<div class="sheet-body">' + (o.body || '') + '</div>' +
      '</div>';
    host.appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('on'));
    const fechar = () => {
      layer.classList.remove('on');
      setTimeout(() => layer.remove(), 240);
    };
    layer.querySelectorAll('[data-close], .sheet-backdrop').forEach(el => el.addEventListener('click', fechar));
    return { el: layer, body: layer.querySelector('.sheet-body'), close: fechar };
  }

  function confirm(msg, opts) {
    const o = opts || {};
    return new Promise(resolve => {
      const s = sheet({
        title: o.title || 'Confirmar',
        body: '<p class="sheet-msg">' + esc(msg) + '</p>' +
          '<div class="sheet-actions">' +
          '<button class="btn outline" data-no>' + esc(o.cancel || 'Cancelar') + '</button>' +
          '<button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-yes>' + esc(o.ok || 'Confirmar') + '</button>' +
          '</div>',
        cls: 'sheet-sm'
      });
      let done = false;
      const fim = v => { if (done) return; done = true; resolve(v); s.close(); };
      s.body.querySelector('[data-yes]').addEventListener('click', () => fim(true));
      s.body.querySelector('[data-no]').addEventListener('click', () => fim(false));
      s.el.querySelector('.sheet-backdrop').addEventListener('click', () => fim(false));
    });
  }

  /* ---------------- 10. Avatar ---------------- */
  function avatarPadrao(nome) {
    const letra = esc(((String(nome || '?').trim()[0]) || '?').toUpperCase());
    const s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs>' +
      '<rect width="64" height="64" fill="url(#g)"/>' +
      '<text x="32" y="44" font-size="30" font-family="Arial,Helvetica,sans-serif" font-weight="700" text-anchor="middle" fill="#fff">' + letra + '</text></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(s);
  }
  function avatar(foto, nome) {
    return (typeof foto === 'string' && /^data:image\//.test(foto)) ? foto : avatarPadrao(nome);
  }

  /* ---------------- 11. Casca: topo, barra inferior, sino ---------------- */
  const PAGES = [
    { p: 'perfil', href: 'perfil.html', icon: 'user', label: 'Perfil' },
    { p: 'faas', href: 'faas.html', icon: 'faas', label: 'FAAs' },
    { p: 'dashboard', href: 'dashboard.html', icon: 'home', label: 'Dashboard', center: true },
    { p: 'pasta', href: 'pasta.html', icon: 'folder', label: 'Pastas / SAME' },
    { p: 'provisoria', href: 'provisoria.html', icon: 'archive', label: 'Provisória' }
  ];

  function perfilAtual() { return Data.perfil(); }

  function topbar(opts) {
    const o = opts || {};
    const top = document.getElementById('topbar');
    if (!top) return;
    const s = Sessao.get(false) || {};
    const p = perfilAtual();
    const usuario = p.usuario || s.usuario || '';
    top.innerHTML =
      '<div class="tb-left">' +
      (o.back ? '<button class="ib" id="tb-back" aria-label="Voltar">' + ic.arrowLeft + '</button>' : '') +
      '<div class="tt">' + esc(o.title || '') + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</div>' +
      '</div>' +
      '<div class="tb-right">' +
      '<button class="ib" id="btn-bell" aria-label="Notificações" title="Notificações">' + ic.bell + '<span class="bell-badge" id="bell-badge" hidden>0</span></button>' +
      '<button class="avatar-btn" id="btn-avatar" aria-label="Sua conta" title="Sua conta"><img id="tb-avatar" alt="Foto de perfil"></button>' +
      '<div class="avatar-menu" id="avatar-menu" hidden>' +
      '<div class="am-head"><img id="am-avatar" alt=""><div><b id="am-nome">' + esc(p.nome) + '</b><span id="am-user">@' + esc(usuario) + '</span></div></div>' +
      '<a class="am-item" href="perfil.html">' + ic.user + 'Meu perfil</a>' +
      '<button class="am-item danger" id="am-sair">' + ic.logout + 'Sair da conta</button>' +
      '</div>' +
      '</div>';

    const foto = avatar(p.foto, p.nome);
    $('#tb-avatar').src = foto;
    $('#am-avatar').src = foto;

    const menu = $('#avatar-menu');
    $('#btn-avatar').addEventListener('click', e => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener('click', e => {
      if (!menu.hidden && !menu.contains(e.target) && !e.target.closest('#btn-avatar')) menu.hidden = true;
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') menu.hidden = true; });
    $('#am-sair').addEventListener('click', () => sair());
    $('#btn-bell').addEventListener('click', abrirNotificacoes);

    if (o.back) {
      const b = $('#tb-back');
      if (b) b.addEventListener('click', () => {
        if (typeof o.onBack === 'function') o.onBack();
        else if (typeof o.back === 'string') location.href = o.back;
        else history.back();
      });
    }
    atualizarSino();
  }

  function nav(ativo) {
    const box = document.getElementById('bottomnav');
    if (!box) return;
    box.innerHTML = PAGES.map(pg => {
      const cls = (pg.center ? 'bn-center' : 'bn') + (pg.p === ativo ? ' is-active' : '');
      const inner = pg.center ? ic.home : ic[pg.icon];
      return '<a class="' + cls + '" href="' + pg.href + '" data-page="' + pg.p + '" aria-label="' + esc(pg.label) + '" title="' + esc(pg.label) + '">' + inner + '</a>';
    }).join('');
    box.addEventListener('click', e => {
      const a = e.target.closest('a[data-page]');
      if (a) { try { LS.setItem('fluxo_ultima_pagina', a.dataset.page); } catch (err) { } }
    });
  }

  function atualizarSino() {
    const badge = document.getElementById('bell-badge');
    if (!badge) return;
    const n = Data.atrasadas().length;
    badge.hidden = !n;
    badge.textContent = n > 9 ? '9+' : String(n);
  }

  function abrirNotificacoes() {
    const atras = Data.atrasadas();
    const avencer = Data.aVencer();
    let corpo = '';
    if (!atras.length && !avencer.length) {
      corpo = '<div class="empty"><div class="eico">' + ic.bell + '</div><b>Tudo em ordem</b><p>Nenhuma FAA atrasada ou perto do prazo agora.</p></div>';
    } else {
      if (atras.length) {
        corpo += '<div class="sec-head" style="margin:2px 0 4px"><h2 style="color:var(--danger)">FAA atrasadas</h2><span class="mut">' + atras.length + '</span></div>';
        corpo += atras.map(f =>
          '<div class="notif" data-ficha="' + esc(f.id) + '" role="button" tabindex="0">' +
          '<div class="nico">' + ic.alert + '</div>' +
          '<div class="ntxt"><b>' + esc(f.paciente) + '</b><span>Atrasada há ' + Math.max(0, diasEntre(f.dataPedido, hojeIso()) - PRAZO) + ' dia(s) · pedido em ' + dtBR(f.dataPedido) + '</span></div>' +
          '</div>').join('');
      }
      if (avencer.length) {
        corpo += '<div class="sec-head" style="margin:16px 0 4px"><h2 style="color:var(--warn)">A vencer (até ' + ALERTA + ' dias)</h2><span class="mut">' + avencer.length + '</span></div>';
        corpo += avencer.map(f =>
          '<div class="notif warn" data-ficha="' + esc(f.id) + '" role="button" tabindex="0">' +
          '<div class="nico">' + ic.clock + '</div>' +
          '<div class="ntxt"><b>' + esc(f.paciente) + '</b><span>Vence em ' + Math.max(0, diasRestantes(f)) + ' dia(s) · ' + dtBR(vencimentoDe(f)) + '</span></div>' +
          '</div>').join('');
      }
    }
    const sh = sheet({ title: 'Notificações', sub: 'Avisos de prazo das fichas FAA', body: corpo });
    sh.body.addEventListener('click', e => {
      const row = e.target.closest('[data-ficha]');
      if (row) {
        sh.close();
        location.href = 'dashboard.html?ficha=' + encodeURIComponent(row.dataset.ficha);
      }
    });
  }

  function shell(opts) {
    const o = opts || {};
    const s = Sessao.get();
    if (!s) return null;
    if (o.page && o.page !== 'perfil') { try { LS.setItem('fluxo_ultima_pagina', o.page); } catch (e) { } }
    topbar(o);
    nav(o.page);
    Chat.init();
    return s;
  }

  function guard() {
    const antes = Sessao.raw();
    const s = Sessao.get();
    if (!s) { location.replace('index.html' + (antes ? '?expirado=1' : '')); return null; }
    return s;
  }

  async function sair(pedirConfirmacao) {
    if (pedirConfirmacao !== false) {
      const ok = await confirm('Deseja sair da sua conta neste aparelho?', { ok: 'Sair', danger: true, title: 'Sair da conta' });
      if (!ok) return;
    }
    if (sb) { try { await sb.auth.signOut(); } catch (e) { } }
    Sessao.clear();
    location.href = 'index.html';
  }

  /* ---------------- 12. Chat ---------------- */
  const Chat = {
    inited: false,
    atual: null,
    aberto: false,
    init() {
      if (this.inited) return;
      const phone = document.getElementById('phone');
      if (!phone) return;
      this.inited = true;
      const root = document.createElement('div');
      root.id = 'chat-root';
      root.innerHTML =
        '<button class="chat-fab" id="chat-fab" aria-label="Mensagens" title="Mensagens">' + ic.chat + '</button>' +
        '<div class="chat-layer" id="chat-layer" hidden>' +
        '<div class="chat-backdrop" data-chat-close></div>' +
        '<section class="chat-panel" role="dialog" aria-label="Mensagens">' +
        '<div class="chat-head">' +
        '<button class="ib sm" id="chat-back" hidden aria-label="Voltar">' + ic.arrowLeft + '</button>' +
        '<div class="ch-t" id="chat-title">Mensagens</div>' +
        '<button class="ib sm" data-chat-close aria-label="Fechar">' + ic.x + '</button>' +
        '</div>' +
        '<div class="chat-body" id="chat-body"></div>' +
        '</section>' +
        '</div>';
      phone.appendChild(root);
      $('#chat-fab').addEventListener('click', () => this.abrir());
      root.querySelectorAll('[data-chat-close]').forEach(b => b.addEventListener('click', () => this.fechar()));
      $('#chat-back').addEventListener('click', () => { this.atual = null; this.render(); });
      root.addEventListener('click', e => {
        const item = e.target.closest('[data-u]');
        if (item) { this.atual = item.dataset.u; this.render(); }
      });
      root.addEventListener('submit', e => {
        e.preventDefault();
        const ta = $('#chat-texto');
        if (!ta) return;
        this.enviar(ta.value);
      });
      root.addEventListener('keydown', e => {
        if (e.target && e.target.id === 'chat-texto' && e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.enviar(e.target.value);
        }
      });
    },
    abrir() {
      this.aberto = true;
      const layer = document.getElementById('chat-layer');
      if (!layer) return;
      layer.hidden = false;
      requestAnimationFrame(() => layer.classList.add('on'));
      document.getElementById('chat-root').classList.add('aberto');
      this.render();
    },
    fechar() {
      this.aberto = false;
      const layer = document.getElementById('chat-layer');
      if (!layer) return;
      layer.classList.remove('on');
      setTimeout(() => { if (!this.aberto) layer.hidden = true; }, 250);
      const r = document.getElementById('chat-root');
      if (r) r.classList.remove('aberto');
    },
    render() {
      const body = document.getElementById('chat-body');
      const title = document.getElementById('chat-title');
      const back = document.getElementById('chat-back');
      if (!body) return;
      if (!this.atual) {
        back.hidden = true;
        title.textContent = 'Mensagens';
        const pessoas = Data.pessoas();
        if (!pessoas.length) {
          body.innerHTML = '<div class="chat-empty">Você ainda não tem pessoas para conversar.<br>Adicione alguém em <b>Perfil › Pessoas</b> usando o @.</div>';
          return;
        }
        const d = Store.get();
        body.innerHTML = '<div class="chat-list">' + pessoas.map(p => {
          const msgs = d.chat[p.usuario] || [];
          const ult = msgs[msgs.length - 1];
          return '<button class="chat-item" data-u="' + esc(p.usuario) + '">' +
            '<span class="cav"><img src="' + esc(avatar(p.foto, p.nome)) + '" alt="">' +
            (p.online ? '<i class="dot verde" style="position:absolute;right:0;bottom:1px;border:2px solid var(--surface);box-shadow:none"></i>' : '') +
            '</span>' +
            '<span class="cmeta"><b>' + esc(p.nome || p.usuario) + '</b><small>' + (ult ? (ult.de === 'eu' ? 'Você: ' : '') + esc(ult.texto) : '@' + esc(p.usuario)) + '</small></span>' +
            (ult ? '<small class="mut-sm">' + esc(horaCurta(ult.em)) + '</small>' : '') +
            '</button>';
        }).join('') + '</div>';
        return;
      }
      const pessoa = Data.pessoas().find(p => p.usuario === this.atual);
      const nome = pessoa ? (pessoa.nome || pessoa.usuario) : this.atual;
      back.hidden = false;
      title.innerHTML = '<img src="' + esc(avatar(pessoa && pessoa.foto, nome)) + '" alt="">' +
        '<span><b style="font-size:15px">' + esc(nome) + '</b><small>@' + esc(this.atual) + (pessoa && pessoa.online ? ' · online' : '') + '</small></span>';
      const msgs = Store.get().chat[this.atual] || [];
      let html = '<div class="chat-conv"><div class="chat-msgs" id="chat-msgs">';
      if (!msgs.length) {
        html += '<div class="chat-empty">Nenhuma mensagem ainda.<br>Diga olá! 👋</div>';
      } else {
        let dia = '';
        msgs.forEach(m => {
          const d = new Date(m.em);
          const rot = d.toDateString() === new Date().toDateString() ? 'Hoje' : d.toLocaleDateString('pt-BR');
          if (rot !== dia) { dia = rot; html += '<div class="chat-day">' + esc(rot) + '</div>'; }
          html += '<div class="bubble ' + (m.de === 'eu' ? 'me' : 'them') + '">' + esc(m.texto) +
            '<span class="hr">' + esc(new Date(m.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) + '</span></div>';
        });
      }
      html += '</div><form class="chat-form" id="chat-form">' +
        '<textarea id="chat-texto" rows="1" maxlength="2000" placeholder="Escreva uma mensagem..."></textarea>' +
        '<button class="chat-send" type="submit" aria-label="Enviar">' + ic.send + '</button>' +
        '</form></div>';
      body.innerHTML = html;
      const box = document.getElementById('chat-msgs');
      if (box) box.scrollTop = box.scrollHeight;
      const ta = document.getElementById('chat-texto');
      if (ta) {
        ta.addEventListener('input', () => {
          ta.style.height = '40px';
          ta.style.height = Math.min(ta.scrollHeight, 104) + 'px';
        });
        setTimeout(() => ta.focus(), 60);
      }
    },
    enviar(texto) {
      const t = String(texto || '').trim();
      if (!t || !this.atual) return;
      const usuario = this.atual;
      Store.update(d => {
        d.chat[usuario] = d.chat[usuario] || [];
        d.chat[usuario].push({ de: 'eu', texto: t, em: new Date().toISOString() });
      });
      if (sessaoNuvem()) {
        try { sb.rpc('enviar_mensagem', { p_usuario: usuario, p_texto: t }).then(() => { }, () => { }); } catch (e) { }
      }
      this.render();
    }
  };

  /* ---------------- 13. Demonstração ---------------- */
  function seedDemo() {
    const contas = lerContas();
    if (!contas.demo) {
      contas.demo = {
        usuario: 'demo',
        nome: 'Ruan Henrique',
        email: 'demo@fluxo.com',
        hash: hashSenha('demo', 'Fluxo@123'),
        codigo: 'FLX-DEMO-2026',
        criadoEm: Date.now()
      };
      gravarContas(contas);
    }
    const k = DKEY + 'demo';
    try { if (LS.getItem(k)) return; } catch (e) { return; }

    const h = hojeIso();
    const agora = new Date().toISOString();
    const ts = dias => new Date(somaDias(h, dias) + 'T13:20:00').toISOString();
    const faas = [
      { paciente: 'Maria da Silva', datas: ['2024-05-20', '2024-03-12'], dataPedido: somaDias(h, -32), status: 'pendente' },
      { paciente: 'João Pereira', datas: ['2023-12-18', '2023-11-03'], dataPedido: somaDias(h, -17), status: 'executando', executor: 'Ruan Henrique', iniciadoEm: agora },
      { paciente: 'Ana Beatriz Souza', datas: ['2024-08-09'], dataPedido: somaDias(h, -6), status: 'pendente' },
      { paciente: 'Carlos Eduardo Lima', datas: ['2024-01-15', '2024-02-20'], dataPedido: somaDias(h, -45), status: 'concluido', concluidoEm: ts(-20) },
      { paciente: 'Fernanda Rocha', datas: ['2023-09-10'], dataPedido: somaDias(h, -60), status: 'concluido', concluidoEm: ts(-40) }
    ].map(f => Object.assign({
      id: novoId('faa'), lote: novoId('lote'), dono: 'demo', donoNome: 'Ruan Henrique', criadoEm: agora
    }, f));

    const lotes = faas.map(f => ({
      id: f.lote, criadoEm: f.criadoEm, dataPedido: f.dataPedido,
      pacientes: [{ nome: f.paciente, datas: f.datas }],
      qtd: 1, dono: 'demo', donoNome: 'Ruan Henrique'
    }));

    const dados = {
      _v: 3,
      perfil: { nome: 'Ruan Henrique', usuario: 'demo', email: 'demo@fluxo.com', foto: '' },
      pessoas: [
        { usuario: 'maria.silva', nome: 'Maria Silva', foto: '', online: true, desde: Date.now() },
        { usuario: 'joao.pereira', nome: 'João Pereira', foto: '', online: false, desde: Date.now() },
        { usuario: 'fred.felipe', nome: 'Frederico Lima', foto: '', online: true, desde: Date.now() }
      ],
      faas: faas,
      lotes: lotes,
      pastas: [{
        id: novoId('pasta'), criadoEm: agora, data: h,
        usuario: 'demo', nomeUsuario: 'Ruan Henrique',
        itens: [
          { same: '178483', nome: 'Douglas' },
          { same: '30025', nome: 'Simone' },
          { same: '128499', nome: 'Vita Cândida' }
        ]
      }],
      provisorias: [
        {
          id: novoId('prov'), criadoEm: agora, data: h,
          usuario: 'demo', nomeUsuario: 'Ruan Henrique',
          numeros: ['148352', '148300', '149000'], arquivada: false
        },
        {
          id: novoId('prov'), criadoEm: new Date(Date.now() - 86400000 * 4).toISOString(), data: somaDias(h, -4),
          usuario: 'demo', nomeUsuario: 'Ruan Henrique',
          numeros: ['147820', '147900'], arquivada: true, arquivadaEm: new Date(Date.now() - 86400000 * 3).toISOString()
        }
      ],
      chat: {
        'maria.silva': [
          { de: 'ele', texto: 'Bom dia! A ficha da Maria já foi pedida?', em: new Date(Date.now() - 3600000 * 5).toISOString() },
          { de: 'eu', texto: 'Bom dia, sim! Já está no Fluxo, prazo até dia ' + dtBR(somaDias(h, -12)) + '.', em: new Date(Date.now() - 3600000 * 4).toISOString() }
        ]
      },
      meta: { criadoEm: Date.now() }
    };
    try { LS.setItem(k, JSON.stringify(dados)); } catch (e) { }
  }

  function loginDemo() {
    const contas = lerContas();
    const c = contas.demo;
    if (!c) return null;
    return Sessao.criar({ uid: 'demo', usuario: c.usuario, nome: c.nome, email: c.email, foto: '', manter: true, sb: false });
  }

  /* ---------------- 14. Contas (login/cadastro/recuperação) ---------------- */
  const Auth = {
    contas: lerContas,
    normalizar: normalizarUsuario,
    hash: hashSenha,
    existe(usuario) { return !!lerContas()[normalizarUsuario(usuario)]; },
    registrar(dados) {
      const usuario = normalizarUsuario(dados.usuario);
      if (!usuario) return { ok: false, erro: 'Escolha um @ válido (3 a 30 caracteres).' };
      if (usuario.length < 3) return { ok: false, erro: 'O @ precisa ter ao menos 3 caracteres.' };
      const contas = lerContas();
      if (contas[usuario]) return { ok: false, erro: 'Esse @ já está em uso.' };
      const codigo = dados.codigo || gerarCodigo();
      contas[usuario] = {
        usuario: usuario,
        nome: (dados.nome || usuario).trim(),
        email: (dados.email || '').trim(),
        hash: hashSenha(usuario, dados.senha),
        codigo: codigo,
        criadoEm: Date.now()
      };
      gravarContas(contas);
      return { ok: true, conta: contas[usuario] };
    },
    entrar(dados) {
      const usuario = normalizarUsuario(dados.usuario);
      const c = lerContas()[usuario];
      if (!c) return { ok: false, erro: 'Usuário ou senha incorretos.' };
      if (c.hash !== hashSenha(usuario, dados.senha)) return { ok: false, erro: 'Usuário ou senha incorretos.' };
      return { ok: true, conta: c };
    },
    redefinir(dados) {
      const usuario = normalizarUsuario(dados.usuario);
      const contas = lerContas();
      const c = contas[usuario];
      if (!c) return { ok: false, erro: 'Usuário não encontrado.' };
      if (String(c.codigo || '').toUpperCase() !== String(dados.codigo || '').trim().toUpperCase()) return { ok: false, erro: 'Código de recuperação incorreto.' };
      c.hash = hashSenha(usuario, dados.senha);
      c.codigo = gerarCodigo();
      gravarContas(contas);
      return { ok: true, conta: c };
    },
    novoCodigo(usuario) {
      const u = normalizarUsuario(usuario);
      const contas = lerContas();
      if (!contas[u]) return null;
      const codigo = gerarCodigo();
      contas[u].codigo = codigo;
      gravarContas(contas);
      Store.update(d => { d.perfil.codigo = codigo; });
      return codigo;
    },
    codigoAtual(usuario) {
      const c = lerContas()[normalizarUsuario(usuario)];
      return c ? c.codigo : '';
    },
    trocarSenha(usuario, nova) {
      const u = normalizarUsuario(usuario);
      const contas = lerContas();
      if (!contas[u]) return false;
      contas[u].hash = hashSenha(u, nova);
      gravarContas(contas);
      return true;
    }
  };

  function gerarCodigo() {
    const alf = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 8; i++) s += alf[Math.floor(Math.random() * alf.length)];
    return 'FLX-' + s.slice(0, 4) + '-' + s.slice(4);
  }

  /* ---------------- 15. Inatividade ---------------- */
  function iniciarInatividade() {
    const s = Sessao.get();
    if (!s || s.manter === true) return;
    let timer = null;
    const sairPorInatividade = () => {
      Sessao.clear();
      try { if (sb) sb.auth.signOut(); } catch (e) { }
      location.replace('index.html?expirado=1');
    };
    const acordar = () => {
      if (!Sessao.get(false)) return;
      Sessao.touch();
      clearTimeout(timer);
      timer = setTimeout(sairPorInatividade, LIMITE_INATIVIDADE);
    };
    ['pointerdown', 'keydown', 'scroll', 'touchstart', 'input', 'focus', 'visibilitychange'].forEach(ev => {
      window.addEventListener(ev, acordar, { passive: true });
    });
    acordar();
  }

  /* ---------------- 16. Inicialização ---------------- */
  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    Theme.apply();

    try {
      const t = new URLSearchParams(location.search).get('tema');
      if (t === 'light' || t === 'dark') Theme.set(t);
    } catch (e) { }
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', () => { if (Theme.get() === 'auto') Theme.apply(); });
    }
    seedDemo();

    const isApp = document.body && document.body.dataset && document.body.dataset.app;
    if (isApp) {
      if (MODO_DEMO && /[?&]demo=1/.test(location.search) && !Sessao.get()) loginDemo();
      iniciarInatividade();
      const s = Sessao.get(false);
      if (s && s.sb) { Remote.puxar(); Remote.ping(); setInterval(() => Remote.ping(), 120000); }
    }
  }

  /* ---------------- 17. Exporta ---------------- */
  window.FL = {
    $: $, $$: $$, esc: esc, key: key, ic: ic,
    fmt: { hojeIso, isoDe, parseIso, somaDias, diasEntre, dtBR, dtHoraBR, horaCurta, pad },
    status: { ST, statusDe, vencimentoDe, diasRestantes, emAlerta, progressoDe, PRAZO, ALERTA },
    data: Data,
    store: Store,
    sessao: Sessao,
    auth: Auth,
    theme: Theme,
    guard: guard,
    shell: shell,
    topbar: topbar,
    nav: nav,
    atualizarSino: atualizarSino,
    abrirNotificacoes: abrirNotificacoes,
    toast: toast,
    sheet: sheet,
    confirm: confirm,
    chat: Chat,
    sair: sair,
    loginDemo: loginDemo,
    gerarCodigo: gerarCodigo,
    normalizarUsuario: normalizarUsuario,
    avatar: avatar,
    avatarPadrao: avatarPadrao,
    novoId: novoId,
    sb: sb,
    sessaoNuvem: sessaoNuvem,
    paginas: PAGES
  };

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState === 'interactive' || document.readyState === 'complete') boot();
})();

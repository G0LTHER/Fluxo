/* =====================================================================
   FLUXO (site) · faas.js — ficha de atendimento ambulatorial
   ===================================================================== */
(function () {
  'use strict';
  const $ = FL.$, esc = FL.esc, ic = FL.ic, fmt = FL.fmt, Data = FL.data;

  let sess = null;
  let P = [];                 // pacientes lidos
  let fs = 14;                // tamanho da fonte (pt)
  let ultimoLote = null;
  const abertos = new Set();
  let tDigita = null;

  const HEAD = /^\[?(?:\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?|\d{1,2}:\d{2}(?::\d{2})?,?\s+\d{1,2}\/\d{1,2}\/\d{2,4})\]?\s*-?\s*/;
  const SPL_DATE = /(\d{1,2}[\/.\-]\d{1,2}[\/.\-](?:\d{4}|\d{2})(?!\d))/;
  const NOISE = /\b(faas?|paciente[s]?|data[s]?|nome|pasta[s]?|chamado|same|prontuario|prontuário)\b/gi;
  const cl = s => String(s).replace(NOISE, ' ').replace(/[^A-Za-zÀ-ÿ0-9'’\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const tc = s => String(s).toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase())
    .replace(/ (Da|De|Do|Das|Dos|E)(?= )/g, x => x.toLowerCase());

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    sess = FL.guard();
    if (!sess) return;
    FL.shell({ page: 'faas', title: 'Fichas FAA', sub: 'Nova ficha de atendimento' });

    $('#faa-dataPedido').value = fmt.hojeIso();

    try {
      const v = Number(localStorage.getItem('fluxo_faa_fs'));
      if (v >= 11 && v <= 26) fs = v;
    } catch (e) { }

    pintarFs();
    renderConf();
    renderHist();
    atualizarBotoes();

    $('#faa-txt').addEventListener('input', () => {
      clearTimeout(tDigita);
      tDigita = setTimeout(reparse, 180);
    });

    $('#faa-dataPedido').addEventListener('change', atualizarBotoes);

    $('#faa-exemplo').addEventListener('click', () => {
      $('#faa-txt').value = '[29/10/2026 08:15] Barracão: Maria da Silva 20/05/2024, 12/03/2024\n[29/10/2026 08:16] Barracão: João Pereira\n18/12/2023\n03/11/2023';
      reparse();
      FL.toast('Exemplo preenchido. Edite ou salve.');
    });

    $('#faa-limpar').addEventListener('click', () => {
      $('#faa-txt').value = '';
      P = [];
      renderConf();
      atualizarBotoes();
    });

    $('#faa-camera').addEventListener('click', abrirCamera);
    $('#faa-file-camera').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) lerFoto(f); });
    $('#faa-file-galeria').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) lerFoto(f); });

    $('#faa-fs-menos').addEventListener('click', () => setFs(fs - 1));
    $('#faa-fs-mais').addEventListener('click', () => setFs(fs + 1));

    $('#faa-salvar').addEventListener('click', salvar);
    $('#faa-visualizar').addEventListener('click', () => visualizar(ultimoLote));
    $('#faa-nova').addEventListener('click', novaFicha);

    $('#faa-conf').addEventListener('input', e => {
      const inp = e.target.closest('[data-nome]');
      if (inp) { P[Number(inp.dataset.nome)].nome = inp.value; atualizarBotoes(); }
    });
    $('#faa-conf').addEventListener('click', e => {
      const b = e.target.closest('[data-rm]');
      if (!b) return;
      P.splice(Number(b.dataset.rm), 1);
      renderConf();
      atualizarBotoes();
    });

    $('#faa-hist').addEventListener('click', onHist);
  }

  /* ---------------- Leitura do texto ---------------- */
  function lerFAAs(texto) {
    const mapa = {};
    let cur = null;

    const nome = n => {
      n = tc(String(n || '').replace(/[^A-Za-zÀ-ÿ'’\s]/g, ' ').trim());
      if (n.length < 3) return;
      const k = FL.key(n);
      if (!mapa[k]) mapa[k] = { nome: n, datas: [] };
      cur = mapa[k];
    };

    const addData = (p, s) => {
      if (!p || !p.datas) return;
      const m = String(s).match(/(\d+)[\/.\-](\d+)[\/.\-](\d+)/);
      if (!m) return;
      let d = +m[1], mo = +m[2], y = +m[3];
      if (y < 100) y += 2000;
      if (d < 1 || d > 31 || mo < 1 || mo > 12) return;
      const iso = y + '-' + fmt.pad(mo) + '-' + fmt.pad(d);
      if (p.datas.indexOf(iso) < 0) p.datas.push(iso);
    };

    String(texto || '').split(/\r?\n/).forEach(linha => {
      let l = linha;
      const h = l.match(HEAD);
      if (h) l = l.slice(h[0].length).replace(/^[^:]{1,40}:\s*/, '');

      const s = l.split(SPL_DATE);
      if (s.length < 3) {
        const t = cl(l);
        if (t) nome(t);
        return;
      }
      const first = cl(s[0]);
      const last = cl(s[s.length - 1]);
      if (!first && last.split(' ').length >= 2) {
        nome(last);
        for (let i = 1; i < s.length; i += 2) addData(cur, s[i]);
        return;
      }
      for (let i = 0; i < s.length - 1; i++) {
        if (i % 2 === 0) {
          const t = cl(s[i]);
          if (t) nome(t);
        } else if (cur) {
          addData(cur, s[i]);
        }
      }
    });

    return Object.keys(mapa).map(k => mapa[k])
      .filter(p => p.nome && p.datas.length)
      .map(p => ({ nome: p.nome, datas: p.datas.slice().sort() }));
  }

  function reparse() {
    P = lerFAAs($('#faa-txt').value);
    renderConf();
    atualizarBotoes();
  }

  /* ---------------- Conferência ---------------- */
  function renderConf() {
    const totalDatas = P.reduce((s, p) => s + p.datas.length, 0);
    $('#faa-conf-count').textContent = P.length ? P.length + ' paciente(s) · ' + totalDatas + ' data(s)' : '';

    if (!P.length) {
      $('#faa-conf').innerHTML = '<div class="conf-empty">Nada lido ainda.<br>Cole o texto ou use a foto do documento.</div>';
      return;
    }

    $('#faa-conf').innerHTML = P.map((p, i) =>
      '<div class="conf-item">' +
      '<div class="conf-top">' +
      '<input type="text" data-nome="' + i + '" value="' + esc(p.nome) + '" aria-label="Nome do paciente">' +
      '<button type="button" class="ib sm" data-rm="' + i + '" aria-label="Remover ' + esc(p.nome) + '">' + ic.x + '</button>' +
      '</div>' +
      '<div class="conf-dates">' + p.datas.map(d => '<span class="date-chip">' + esc(fmt.dtBR(d)) + '</span>').join('') + '</div>' +
      '</div>'
    ).join('');
  }

  function atualizarBotoes() {
    const validos = P.filter(p => p.nome.trim() && p.datas.length);
    $('#faa-salvar').disabled = !validos.length || !$('#faa-dataPedido').value;
  }

  /* ---------------- Fonte ---------------- */
  function pintarFs() { $('#faa-fs-val').innerHTML = fs + ' <small>pt</small>'; }
  function setFs(v) {
    fs = Math.max(11, Math.min(26, Math.round(v)));
    try { localStorage.setItem('fluxo_faa_fs', String(fs)); } catch (e) { }
    pintarFs();
  }

  /* ---------------- Salvar ---------------- */
  function salvar() {
    const pacientes = P.filter(p => p.nome.trim() && p.datas.length)
      .map(p => ({ nome: p.nome.trim(), datas: p.datas.slice().sort() }));
    if (!pacientes.length) return FL.toast('Nada para salvar. Cole o texto ou leia a foto.', { tipo: 'erro' });

    const dataPedido = $('#faa-dataPedido').value || fmt.hojeIso();
    const agora = new Date().toISOString();
    const perfil = Data.perfil();
    const loteId = FL.novoId('lote');

    FL.store.update(d => {
      pacientes.forEach(p => {
        d.faas.push({
          id: FL.novoId('faa'),
          lote: loteId,
          paciente: p.nome,
          datas: p.datas,
          dataPedido: dataPedido,
          status: 'pendente',
          executor: '',
          executorId: '',
          iniciadoEm: '',
          concluidoEm: '',
          criadoEm: agora,
          dono: sess.uid,
          donoNome: perfil.nome
        });
      });
      d.lotes.push({
        id: loteId,
        criadoEm: agora,
        dataPedido: dataPedido,
        pacientes: pacientes,
        qtd: pacientes.length,
        dono: sess.uid,
        donoNome: perfil.nome
      });
    });

    ultimoLote = loteId;
    $('#faa-visualizar').hidden = false;
    $('#faa-nova').hidden = false;
    $('#faa-save-hint').textContent = 'FAA salva. Toque em Visualizar para abrir o documento gerado.';
    renderHist();
    atualizarBotoes();
    FL.toast(pacientes.length + (pacientes.length === 1 ? ' ficha salva' : ' fichas salvas') + '! Já pode visualizar.');
    FL.atualizarSino();
  }

  function novaFicha() {
    $('#faa-txt').value = '';
    $('#faa-dataPedido').value = fmt.hojeIso();
    P = [];
    ultimoLote = null;
    $('#faa-visualizar').hidden = true;
    $('#faa-nova').hidden = true;
    $('#faa-save-hint').textContent = 'O arquivo só é gerado depois que a ficha é salva.';
    renderConf();
    atualizarBotoes();
    const c = $('#content');
    if (c) c.scrollTop = 0;
    $('#faa-txt').focus();
  }

  function dadosDoLote(lote) {
    return {
      pacientes: lote.pacientes,
      dataPedido: lote.dataPedido,
      responsavel: lote.donoNome || Data.perfil().nome,
      fs: fs
    };
  }

  function visualizar(loteId) {
    const lote = Data.lotes().find(l => l.id === loteId) || Data.lotes()[0];
    if (!lote) return FL.toast('Salve a FAA primeiro.', { tipo: 'erro' });
    FL.doc.abrirFAA(dadosDoLote(lote));
  }

  /* ---------------- Histórico ---------------- */
  function renderHist() {
    const lotes = Data.lotes();
    $('#faa-hist-count').textContent = lotes.length ? lotes.length + ' salvo(s)' : '';
    if (!lotes.length) {
      $('#faa-hist').innerHTML = '<div class="empty"><div class="eico">' + ic.faas + '</div>' +
        '<b>Nenhuma FAA salva</b><p>As fichas que você salvar aparecem aqui, com o documento pronto para visualizar.</p></div>';
      return;
    }
    $('#faa-hist').innerHTML = lotes.map(l => {
      const pcs = l.pacientes || [];
      const aberto = abertos.has(l.id);
      const titulo = pcs.length ? (pcs[0].nome + (pcs.length > 1 ? ' +' + (pcs.length - 1) : '')) : 'Ficha FAA';
      return '<article class="saved">' +
        '<div class="saved-head">' +
        '<div class="ico">' + ic.faas + '</div>' +
        '<div class="inf"><b>' + esc(titulo) + '</b>' +
        '<span>' + pcs.length + ' ficha(s) · ' + esc(fmt.dtHoraBR(l.criadoEm)) + ' · pedido ' + esc(fmt.dtBR(l.dataPedido)) + '</span></div>' +
        '<button type="button" class="ficha-arrow" data-hist="toggle" data-id="' + esc(l.id) + '" aria-label="Detalhes">' + ic.chevronDown + '</button>' +
        '</div>' +
        '<div class="saved-actions">' +
        '<button type="button" class="btn-xs pri" data-hist="ver" data-id="' + esc(l.id) + '">' + ic.eye + 'Visualizar</button>' +
        '<button type="button" class="btn-xs" data-hist="pdf" data-id="' + esc(l.id) + '">' + ic.download + 'PDF</button>' +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn-xs danger" data-hist="del" data-id="' + esc(l.id) + '" aria-label="Excluir">' + ic.trash + '</button>' +
        '</div>' +
        (aberto
          ? '<div class="ficha-detail">' + pcs.map(p =>
            '<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--bd);gap:8px">' +
            '<b style="font-size:13px">' + esc(p.nome) + '</b>' +
            '<span class="mut-sm">' + (p.datas || []).length + ' data(s)</span></div>').join('') + '</div>'
          : '') +
        '</article>';
    }).join('');
  }

  function onHist(e) {
    const b = e.target.closest('[data-hist]');
    if (!b) return;
    const id = b.dataset.id, a = b.dataset.hist;
    const lote = Data.lotes().find(l => l.id === id);
    if (!lote) return;

    if (a === 'toggle') {
      if (abertos.has(id)) abertos.delete(id); else abertos.add(id);
      renderHist();
    } else if (a === 'ver') {
      FL.doc.abrirFAA(dadosDoLote(lote));
    } else if (a === 'pdf') {
      FL.doc.baixar('faa', dadosDoLote(lote));
    } else if (a === 'del') {
      excluirLote(id);
    }
  }

  async function excluirLote(id) {
    const ok = await FL.confirm('Excluir esta FAA salva? As fichas também saem do dashboard.', {
      ok: 'Excluir', danger: true, title: 'Excluir FAA'
    });
    if (!ok) return;
    FL.store.update(d => {
      d.lotes = d.lotes.filter(l => l.id !== id);
      d.faas = d.faas.filter(f => f.lote !== id);
    });
    if (ultimoLote === id) {
      ultimoLote = null;
      $('#faa-visualizar').hidden = true;
      $('#faa-nova').hidden = true;
      $('#faa-save-hint').textContent = 'O arquivo só é gerado depois que a ficha é salva.';
    }
    renderHist();
    FL.toast('FAA excluída.');
    FL.atualizarSino();
  }

  /* ---------------- Câmera / galeria + IA ---------------- */
  function abrirCamera() {
    const sh = FL.sheet({
      title: 'Foto do documento',
      sub: 'A IA lê a foto e tenta preencher os nomes e as datas.',
      body: '<div class="stack">' +
        '<button type="button" class="btn primary block" id="opt-cam">' + ic.camera + 'Tirar foto</button>' +
        '<button type="button" class="btn outline block" id="opt-gal">' + ic.image + 'Escolher da galeria</button>' +
        '</div>'
    });
    sh.body.querySelector('#opt-cam').addEventListener('click', () => { sh.close(); $('#faa-file-camera').click(); });
    sh.body.querySelector('#opt-gal').addEventListener('click', () => { sh.close(); $('#faa-file-galeria').click(); });
  }

  function carregarTesseract() {
    return new Promise((resolve, reject) => {
      if (window.Tesseract) return resolve(window.Tesseract);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
      s.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('sem-tesseract'));
      s.onerror = () => reject(new Error('offline'));
      document.head.appendChild(s);
    });
  }

  function lerFoto(file) {
    if (!file.type || !/^image\//.test(file.type)) return FL.toast('Escolha um arquivo de imagem.', { tipo: 'erro' });
    if (file.size > 15 * 1024 * 1024) return FL.toast('Imagem muito grande (máximo 15 MB).', { tipo: 'erro' });

    const url = URL.createObjectURL(file);
    const sh = FL.sheet({
      title: 'Ler foto do documento',
      sub: 'Confira se está legível. A leitura pode levar alguns segundos.',
      body: '<img class="ocr-img" id="ocr-img" alt="Foto do documento">' +
        '<div class="ocr-bar" id="ocr-bar" hidden><i></i></div>' +
        '<p class="ocr-status" id="ocr-status">A IA vai extrair os nomes e as datas da ficha.</p>' +
        '<div class="sheet-actions">' +
        '<button type="button" class="btn outline" data-close>Cancelar</button>' +
        '<button type="button" class="btn primary" id="ocr-go">' + ic.sparkles + 'Ler com IA</button>' +
        '</div>'
    });
    sh.body.querySelector('#ocr-img').src = url;

    const status = sh.body.querySelector('#ocr-status');
    const bar = sh.body.querySelector('#ocr-bar');
    const fill = bar.querySelector('i');
    const btn = sh.body.querySelector('#ocr-go');

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      bar.hidden = false;
      status.textContent = 'Preparando a leitura…';
      try {
        const T = await carregarTesseract();
        const res = await T.recognize(file, 'por', {
          logger: m => {
            if (m.status === 'recognizing text') {
              const p = Math.round((m.progress || 0) * 100);
              fill.style.width = p + '%';
              status.textContent = 'Lendo o documento… ' + p + '%';
            }
          }
        });
        const texto = (res && res.data && res.data.text || '').trim();
        if (!texto) throw new Error('vazio');
        URL.revokeObjectURL(url);
        aplicarTexto(texto);
        sh.close();
        FL.toast('Texto extraído! Confira os nomes e datas antes de salvar.');
      } catch (err) {
        status.textContent = 'Não consegui ler esta foto. Tente outra com mais luz e o documento reto — ou digite os dados manualmente.';
        bar.hidden = true;
        btn.disabled = false;
        const acoes = sh.body.querySelector('.sheet-actions');
        if (acoes && !acoes.querySelector('#ocr-manual')) {
          const m = document.createElement('button');
          m.type = 'button';
          m.className = 'btn soft';
          m.id = 'ocr-manual';
          m.textContent = 'Digitar manualmente';
          m.addEventListener('click', () => sh.close());
          acoes.appendChild(m);
        }
      }
    });
  }

  function aplicarTexto(texto) {
    const ta = $('#faa-txt');
    ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + texto;
    reparse();
  }

  window.FluxoPages = window.FluxoPages || {};
  window.FluxoPages.faa = { render: () => { renderHist(); } };
})();

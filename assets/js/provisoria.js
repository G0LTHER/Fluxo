/* =====================================================================
   FLUXO (site) · provisoria.js — Guarda Provisória
   Prévia em tempo real, salva aqui e/ou arquiva no dashboard.
   ===================================================================== */
(function () {
  'use strict';
  const $ = FL.$, esc = FL.esc, ic = FL.ic, fmt = FL.fmt, Data = FL.data;

  let sess = null;
  let numeros = [];
  let ultima = null;
  const abertos = new Set();

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    sess = FL.guard();
    if (!sess) return;
    FL.shell({ page: 'provisoria', title: 'Provisória', sub: 'Guarda provisória' });

    $('#prov-txt').addEventListener('input', atualizar);

    $('#prov-exemplo').addEventListener('click', () => {
      $('#prov-txt').value = '148352\n148300\n149000\n147820';
      atualizar();
      FL.toast('Exemplo preenchido.');
    });
    $('#prov-limpar').addEventListener('click', () => { $('#prov-txt').value = ''; atualizar(); });

    $('#prov-salvar').addEventListener('click', () => salvar(false));
    $('#prov-arquivar').addEventListener('click', () => salvar(true));
    $('#prov-visualizar').addEventListener('click', () => visualizar(ultima));
    $('#prov-hist').addEventListener('click', onHist);

    atualizar();
    renderHist();
  }

  const nomeUsuario = () => Data.perfil().nome;

  /* ---------------- Leitura ---------------- */
  function lerNumeros(texto) {
    const nums = [];
    String(texto || '').split(/\r?\n/).forEach(linha => {
      const m = linha.match(/\b\d{1,8}\b/g);
      if (!m) return;
      m.forEach(n => {
        const v = n.replace(/^0+(?=\d)/, '');
        if (nums.indexOf(v) < 0) nums.push(v);
      });
    });
    return nums.sort((a, b) => Number(a) - Number(b));
  }

  /* ---------------- Prévia / botões ---------------- */
  function atualizar() {
    numeros = lerNumeros($('#prov-txt').value);
    $('#prov-prev').innerHTML = FL.doc.provDoc({
      numeros: numeros,
      usuario: nomeUsuario(),
      data: fmt.hojeIso(),
      fs: 14
    });
    const tem = numeros.length > 0;
    $('#prov-salvar').disabled = !tem;
    $('#prov-arquivar').disabled = !tem;
    if (!tem) $('#prov-visualizar').hidden = true;
  }

  /* ---------------- Salvar / arquivar ---------------- */
  function salvar(arquivar) {
    const nums = lerNumeros($('#prov-txt').value);
    if (!nums.length) return FL.toast('Nada para salvar. Cole os números das pastas.', { tipo: 'erro' });

    const perfil = Data.perfil();
    const id = FL.novoId('prov');
    const agora = new Date().toISOString();

    FL.store.update(d => {
      d.provisorias.push({
        id: id,
        criadoEm: agora,
        data: fmt.hojeIso(),
        usuario: perfil.usuario || sess.usuario,
        nomeUsuario: nomeUsuario(),
        numeros: nums,
        arquivada: !!arquivar,
        arquivadaEm: arquivar ? agora : ''
      });
    });

    ultima = id;
    $('#prov-visualizar').hidden = false;
    renderHist();
    FL.toast(arquivar
      ? 'Provisória arquivada! Ela está em Dashboard › Arquivados.'
      : 'Provisória salva aqui em “Salvos”.');
  }

  function dados(p) {
    return { numeros: p.numeros, usuario: p.nomeUsuario, data: p.data, fs: 14 };
  }

  function visualizar(id) {
    const item = Data.provisorias().find(p => p.id === id) || Data.provisorias()[0];
    if (!item) return FL.toast('Salve a provisória primeiro.', { tipo: 'erro' });
    FL.doc.abrirPROV(dados(item));
  }

  /* ---------------- Histórico ---------------- */
  function renderHist() {
    const lista = Data.provisorias();
    $('#prov-hist-count').textContent = lista.length ? lista.length + ' salvo(s)' : '';
    if (!lista.length) {
      $('#prov-hist').innerHTML = '<div class="empty"><div class="eico">' + ic.archive + '</div>' +
        '<b>Nenhuma provisória salva</b><p>As provisórias que você salvar aparecem aqui.</p></div>';
      return;
    }
    $('#prov-hist').innerHTML = lista.map(p => {
      const aberto = abertos.has(p.id);
      return '<article class="saved">' +
        '<div class="saved-head">' +
        '<div class="ico">' + ic.archive + '</div>' +
        '<div class="inf"><b>' + (p.numeros || []).length + ' pasta(s)</b>' +
        '<span>' + esc(fmt.dtHoraBR(p.criadoEm)) + ' · ' + esc(p.nomeUsuario || '') + '</span></div>' +
        '<button type="button" class="ficha-arrow" data-hist="toggle" data-id="' + esc(p.id) + '" aria-label="Detalhes">' + ic.chevronDown + '</button>' +
        '</div>' +
        '<div class="row" style="margin-top:8px">' +
        (p.arquivada
          ? '<span class="chip pri">Arquivada no dashboard</span>'
          : '<span class="chip">Salva aqui</span>') +
        '</div>' +
        '<div class="saved-actions">' +
        '<button type="button" class="btn-xs pri" data-hist="ver" data-id="' + esc(p.id) + '">' + ic.eye + 'Visualizar</button>' +
        '<button type="button" class="btn-xs" data-hist="pdf" data-id="' + esc(p.id) + '">' + ic.download + 'PDF</button>' +
        (p.arquivada ? '' : '<button type="button" class="btn-xs" data-hist="arq" data-id="' + esc(p.id) + '">' + ic.archive + 'Arquivar</button>') +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn-xs danger" data-hist="del" data-id="' + esc(p.id) + '" aria-label="Excluir">' + ic.trash + '</button>' +
        '</div>' +
        (aberto
          ? '<div class="ficha-detail"><div class="dates-chips">' + (p.numeros || []).map(n =>
            '<span class="date-chip">Pasta ' + esc(n) + '</span>').join('') + '</div></div>'
          : '') +
        '</article>';
    }).join('');
  }

  function onHist(e) {
    const b = e.target.closest('[data-hist]');
    if (!b) return;
    const id = b.dataset.id, a = b.dataset.hist;
    const item = Data.provisorias().find(p => p.id === id);
    if (!item) return;

    if (a === 'toggle') {
      if (abertos.has(id)) abertos.delete(id); else abertos.add(id);
      renderHist();
    } else if (a === 'ver') {
      FL.doc.abrirPROV(dados(item));
    } else if (a === 'pdf') {
      FL.doc.baixar('prov', dados(item));
    } else if (a === 'arq') {
      FL.store.update(d => {
        const p = d.provisorias.find(x => x.id === id);
        if (p) { p.arquivada = true; p.arquivadaEm = new Date().toISOString(); }
      });
      renderHist();
      FL.toast('Arquivada! Veja em Dashboard › Arquivados.');
    } else if (a === 'del') {
      excluir(id);
    }
  }

  async function excluir(id) {
    const ok = await FL.confirm('Excluir esta provisória salva?', { ok: 'Excluir', danger: true, title: 'Excluir provisória' });
    if (!ok) return;
    FL.store.update(d => { d.provisorias = d.provisorias.filter(p => p.id !== id); });
    if (ultima === id) {
      ultima = null;
      $('#prov-visualizar').hidden = true;
    }
    renderHist();
    FL.toast('Provisória excluída.');
  }

  window.FluxoPages = window.FluxoPages || {};
  window.FluxoPages.prov = { render: () => { renderHist(); } };
})();

/* =====================================================================
   FLUXO (site) · pasta.js — Pastas / SAME
   Prévia em tempo real com o nome do usuário logado. Salva aqui mesmo.
   ===================================================================== */
(function () {
  'use strict';
  const $ = FL.$, esc = FL.esc, ic = FL.ic, fmt = FL.fmt, Data = FL.data;

  let sess = null;
  let itens = [];
  let ultima = null;
  const abertos = new Set();

  const HEAD = /^\[?(?:\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?|\d{1,2}:\d{2}(?::\d{2})?,?\s+\d{1,2}\/\d{1,2}\/\d{2,4})\]?\s*-?\s*/;
  const tc = s => String(s).toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase())
    .replace(/ (Da|De|Do|Das|Dos|E)(?= )/g, x => x.toLowerCase());

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    sess = FL.guard();
    if (!sess) return;
    FL.shell({ page: 'pasta', title: 'Pastas / SAME', sub: 'Lista com o seu nome' });

    $('#same-txt').addEventListener('input', atualizar);
    $('#same-exemplo').addEventListener('click', () => {
      $('#same-txt').value = '178483 Douglas\n30025 Simone\n128499 Vita Cândida\nNeymar 133064';
      atualizar();
      FL.toast('Exemplo preenchido.');
    });
    $('#same-limpar').addEventListener('click', () => { $('#same-txt').value = ''; atualizar(); });

    $('#same-salvar').addEventListener('click', salvar);
    $('#same-visualizar').addEventListener('click', () => visualizar(ultima));
    $('#same-hist').addEventListener('click', onHist);

    atualizar();
    renderHist();
  }

  const nomeUsuario = () => Data.perfil().nome;

  /* ---------------- Leitura ---------------- */
  function lerPastas(texto) {
    const lista = [];
    const vistos = {};
    String(texto || '').split(/\r?\n/).forEach(linha => {
      let l = linha.trim();
      if (!l) return;
      const h = l.match(HEAD);
      if (h) l = l.slice(h[0].length).replace(/^[^:]{1,40}:\s*/, '');
      l = l.trim();
      if (!l) return;

      let m, item = null;
      if ((m = l.match(/^(\d{1,8})$/))) item = { same: m[1], nome: '' };
      else if ((m = l.match(/^(\d{1,8})\s+(.+)$/))) item = { same: m[1], nome: tc(m[2].trim()) };
      else if ((m = l.match(/^(.+?)\s+(\d{1,8})$/))) item = { same: m[2], nome: tc(m[1].trim()) };
      else if (/[A-Za-zÀ-ÿ]{2}/.test(l)) item = { same: '', nome: tc(l) };

      if (!item) return;
      const k = item.same + '|' + FL.key(item.nome);
      if (vistos[k]) return;
      vistos[k] = 1;
      lista.push(item);
    });
    return lista;
  }

  /* ---------------- Prévia / botões ---------------- */
  function atualizar() {
    itens = lerPastas($('#same-txt').value);
    $('#same-prev').innerHTML = FL.doc.sameDoc({
      itens: itens,
      usuario: nomeUsuario(),
      data: fmt.hojeIso(),
      fs: 14
    });
    const validos = itens.filter(i => i.same || i.nome);
    $('#same-salvar').disabled = !validos.length;
    if (!validos.length) {
      $('#same-visualizar').hidden = true;
    }
  }

  /* ---------------- Salvar ---------------- */
  function salvar() {
    const validos = itens.filter(i => String(i.same || '').trim() || String(i.nome || '').trim());
    if (!validos.length) return FL.toast('Nada para salvar. Cole a lista de pastas.', { tipo: 'erro' });

    const perfil = Data.perfil();
    const id = FL.novoId('pasta');
    const agora = new Date().toISOString();

    FL.store.update(d => {
      d.pastas.push({
        id: id,
        criadoEm: agora,
        data: fmt.hojeIso(),
        usuario: perfil.usuario || sess.usuario,
        nomeUsuario: nomeUsuario(),
        itens: validos.map(i => ({ same: String(i.same || '').trim(), nome: String(i.nome || '').trim() }))
      });
    });

    ultima = id;
    $('#same-visualizar').hidden = false;
    $('#same-hint').textContent = 'Lista salva aqui. Toque em Visualizar para abrir o documento.';
    renderHist();
    FL.toast(validos.length + ' pasta(s) salva(s) em “Salvos”.');
  }

  function dados(item) {
    return { itens: item.itens, usuario: item.nomeUsuario, data: item.data, fs: 14 };
  }

  function visualizar(id) {
    const item = Data.pastas().find(p => p.id === id) || Data.pastas()[0];
    if (!item) return FL.toast('Salve a lista primeiro.', { tipo: 'erro' });
    FL.doc.abrirSAME(dados(item));
  }

  /* ---------------- Histórico ---------------- */
  function renderHist() {
    const lista = Data.pastas();
    $('#same-hist-count').textContent = lista.length ? lista.length + ' salvo(s)' : '';
    if (!lista.length) {
      $('#same-hist').innerHTML = '<div class="empty"><div class="eico">' + ic.folder + '</div>' +
        '<b>Nenhuma lista salva</b><p>As listas de Pastas / SAME que você salvar aparecem aqui.</p></div>';
      return;
    }
    $('#same-hist').innerHTML = lista.map(p => {
      const aberto = abertos.has(p.id);
      return '<article class="saved">' +
        '<div class="saved-head">' +
        '<div class="ico">' + ic.folder + '</div>' +
        '<div class="inf"><b>' + (p.itens || []).length + ' pasta(s)</b>' +
        '<span>' + esc(fmt.dtHoraBR(p.criadoEm)) + ' · ' + esc(p.nomeUsuario || '') + '</span></div>' +
        '<button type="button" class="ficha-arrow" data-hist="toggle" data-id="' + esc(p.id) + '" aria-label="Detalhes">' + ic.chevronDown + '</button>' +
        '</div>' +
        '<div class="saved-actions">' +
        '<button type="button" class="btn-xs pri" data-hist="ver" data-id="' + esc(p.id) + '">' + ic.eye + 'Visualizar</button>' +
        '<button type="button" class="btn-xs" data-hist="pdf" data-id="' + esc(p.id) + '">' + ic.download + 'PDF</button>' +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn-xs danger" data-hist="del" data-id="' + esc(p.id) + '" aria-label="Excluir">' + ic.trash + '</button>' +
        '</div>' +
        (aberto
          ? '<div class="ficha-detail"><div class="dates-chips">' + (p.itens || []).map(i =>
            '<span class="date-chip">' + esc(i.same || '—') + (i.nome ? ' · ' + esc(i.nome) : '') + '</span>').join('') + '</div></div>'
          : '') +
        '</article>';
    }).join('');
  }

  function onHist(e) {
    const b = e.target.closest('[data-hist]');
    if (!b) return;
    const id = b.dataset.id, a = b.dataset.hist;
    const item = Data.pastas().find(p => p.id === id);
    if (!item) return;

    if (a === 'toggle') {
      if (abertos.has(id)) abertos.delete(id); else abertos.add(id);
      renderHist();
    } else if (a === 'ver') {
      FL.doc.abrirSAME(dados(item));
    } else if (a === 'pdf') {
      FL.doc.baixar('same', dados(item));
    } else if (a === 'del') {
      excluir(id);
    }
  }

  async function excluir(id) {
    const ok = await FL.confirm('Excluir esta lista salva?', { ok: 'Excluir', danger: true, title: 'Excluir lista' });
    if (!ok) return;
    FL.store.update(d => { d.pastas = d.pastas.filter(p => p.id !== id); });
    if (ultima === id) {
      ultima = null;
      $('#same-visualizar').hidden = true;
      $('#same-hint').textContent = 'A lista salva aparece em “Salvos”, abaixo.';
    }
    renderHist();
    FL.toast('Lista excluída.');
  }

  window.FluxoPages = window.FluxoPages || {};
  window.FluxoPages.same = { render: () => { renderHist(); } };
})();

/* =====================================================================
   FLUXO · doc.js
   Gera o documento (FAA / Pastas-SAME / Provisória) para visualizar,
   imprimir e baixar em PDF. Fonte grande por padrão (14pt, mínimo 11pt).
   ===================================================================== */
(function (FL) {
  'use strict';
  if (!FL) return;

  const esc = FL.esc;
  const fmt = FL.fmt;
  const ic = FL.ic;
  const $ = FL.$;

  /* ---------- Estilos do documento (usados na prévia e na impressão) ---------- */
  const DOC_CSS = `
  .doc-page{width:100%;min-height:297mm;padding:16mm 14mm;box-sizing:border-box;background:#fff;color:#111827}
  .doc{font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:calc(var(--fs,14) * 1pt);line-height:1.5;width:100%}
  .doc *{box-sizing:border-box}
  .doc-top{display:flex;align-items:flex-end;justify-content:space-between;gap:10pt;border-bottom:2.2pt solid #111827;padding-bottom:5pt;margin-bottom:13pt}
  .doc-brand{display:flex;align-items:center;gap:6pt;font-weight:800;font-size:9.5pt;letter-spacing:.22em;text-transform:uppercase;color:#0d9488}
  .doc-brand i{width:15pt;height:15pt;border-radius:4.5pt;background:#0d9488;display:block}
  .doc-right{text-align:right;font-size:9pt;color:#4b5563;line-height:1.4}
  .doc-right b{display:block;color:#111827;font-size:9.5pt}
  .doc h1{font-size:1.3em;line-height:1.25;margin:0 0 4pt;letter-spacing:-.2pt}
  .doc-sub{font-size:.82em;color:#4b5563;margin-bottom:12pt;line-height:1.5}
  .doc-patient{padding:7pt 0 8pt;border-top:.8pt solid #e5e7eb;break-inside:avoid}
  .doc-patient:first-of-type{border-top:0;padding-top:2pt}
  .doc-name{font-size:1.12em;font-weight:800;margin-bottom:5pt;line-height:1.3}
  .doc-dates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4pt 8pt}
  .doc-date-item{display:flex;align-items:center;gap:5pt;font-size:.95em;font-variant-numeric:tabular-nums;white-space:nowrap}
  .doc-box{width:9.5pt;height:9.5pt;border:1.1pt solid #111827;border-radius:1.6pt;flex-shrink:0;display:inline-block}
  .doc-list{list-style:none;margin:0;padding:0}
  .doc-list li{display:flex;align-items:flex-start;gap:7pt;padding:4.5pt 0;border-bottom:.6pt solid #e5e7eb;break-inside:avoid;font-size:.98em;line-height:1.4}
  .doc-list li b{font-weight:800;font-variant-numeric:tabular-nums}
  .doc-list li span{flex:1;min-width:0;word-break:break-word}
  .doc-prov-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12pt}
  .doc-prov-list li{font-weight:700;font-size:1.02em;padding:5pt 0;border-bottom:.6pt solid #e5e7eb;break-inside:avoid;font-variant-numeric:tabular-nums}
  .doc-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:10pt;margin-top:16pt;padding-top:6pt;border-top:.8pt dashed #cbd5e1;font-size:.68em;color:#64748b;line-height:1.5}
  .doc-foot b{color:#111827}
  .doc-empty{color:#9ca3af;text-align:center;padding:60pt 0;font-size:1em}
  .doc-sign{margin-top:22pt;display:flex;gap:20pt;justify-content:space-between}
  .doc-sign div{flex:1;border-top:.8pt solid #9ca3af;padding-top:4pt;font-size:.75em;color:#4b5563;text-align:center}
  `;

  function injetarCSS() {
    if (document.getElementById('doc-styles')) return;
    const st = document.createElement('style');
    st.id = 'doc-styles';
    st.textContent = DOC_CSS;
    document.head.appendChild(st);
  }

  const clampFs = v => Math.max(11, Math.min(26, Math.round(Number(v) || 14)));

  function topoDoc(etiqueta, direita) {
    return '<div class="doc-top"><div class="doc-brand"><i></i>Fluxo</div>' +
      '<div class="doc-right"><b>' + esc(etiqueta) + '</b><span>' + esc(direita || '') + '</span></div></div>';
  }

  function peDoc(responsavel) {
    const agora = new Date();
    return '<div class="doc-foot"><span>Documento criado em <b>' + esc(agora.toLocaleDateString('pt-BR')) +
      '</b> às <b>' + esc(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) + '</b></span>' +
      '<span>Por <b>' + esc(responsavel || 'Fluxo') + '</b></span></div>';
  }

  /* ---------- HTML: FAA ---------- */
  function faaDoc(d) {
    const fs = clampFs(d.fs);
    const pacientes = (d.pacientes || []).filter(p => p && String(p.nome || '').trim());
    const corpo = pacientes.length
      ? pacientes.map(p => {
        const datas = (p.datas || []).slice().sort();
        return '<div class="doc-patient"><div class="doc-name">' + esc(String(p.nome).trim()) + '</div>' +
          '<div class="doc-dates">' + datas.map(iso =>
            '<span class="doc-date-item"><i class="doc-box"></i>' + esc(fmt.dtBR(iso)) + '</span>'
          ).join('') + '</div></div>';
      }).join('')
      : '<div class="doc-empty">Nenhum paciente informado.</div>';
    const prazo = d.dataPedido ? fmt.dtBR(fmt.somaDias(d.dataPedido, FL.status.PRAZO)) : '';
    return '<div class="doc" style="--fs:' + fs + '">' +
      topoDoc('Fichas FAA', d.dataPedido ? 'Pedido em ' + fmt.dtBR(d.dataPedido) : fmt.dtBR(fmt.hojeIso())) +
      '<h1>Fichas de Atendimento Ambulatorial</h1>' +
      '<div class="doc-sub">' +
      pacientes.length + (pacientes.length === 1 ? ' paciente' : ' pacientes') +
      (d.responsavel ? ' · Responsável: ' + esc(d.responsavel) : '') +
      (prazo ? ' · Prazo: ' + esc(prazo) : '') +
      '</div>' + corpo + peDoc(d.responsavel) +
      '</div>';
  }
  function faaHTML(d) { return '<div class="doc-page">' + faaDoc(d) + '</div>'; }

  /* ---------- HTML: Pastas / SAME ---------- */
  function sameDoc(d) {
    const fs = clampFs(d.fs);
    const itens = (d.itens || []).filter(i => String(i.same || '').trim() || String(i.nome || '').trim());
    const corpo = itens.length
      ? '<ul class="doc-list">' + itens.map(i => {
        const num = String(i.same || '').trim();
        const nome = String(i.nome || '').trim();
        return '<li><i class="doc-box"></i><span>' +
          (num ? '<b>' + esc(num) + '</b>' : '') +
          (num && nome ? ' – ' : '') + esc(nome) + '</span></li>';
      }).join('') + '</ul>'
      : '<div class="doc-empty">Nenhuma pasta informada.</div>';
    return '<div class="doc" style="--fs:' + fs + '">' +
      topoDoc('Pastas / SAME', fmt.dtBR(d.data || fmt.hojeIso())) +
      '<h1>Lista de Pastas / SAME</h1>' +
      '<div class="doc-sub">' + esc(d.usuario || '') + ' · ' + itens.length + ' pasta(s)</div>' +
      corpo + peDoc(d.usuario) + '</div>';
  }
  function sameHTML(d) { return '<div class="doc-page">' + sameDoc(d) + '</div>'; }

  /* ---------- HTML: Provisória ---------- */
  function provDoc(d) {
    const fs = clampFs(d.fs);
    const nums = (d.numeros || []).filter(n => String(n).trim());
    const corpo = nums.length
      ? '<ul class="doc-prov-list">' + nums.map(n => '<li>Pasta: ' + esc(String(n)) + '</li>').join('') + '</ul>'
      : '<div class="doc-empty">Nenhum número informado.</div>';
    return '<div class="doc" style="--fs:' + fs + '">' +
      topoDoc('Provisória', fmt.dtBR(d.data || fmt.hojeIso())) +
      '<h1>Guarda Provisória</h1>' +
      '<div class="doc-sub">Provisória de ' + esc(d.usuario || '') + ' · ' + nums.length + ' pasta(s)</div>' +
      corpo + peDoc(d.usuario) + '</div>';
  }
  function provHTML(d) { return '<div class="doc-page">' + provDoc(d) + '</div>'; }

  /* ---------- Visualizador ---------- */
  let escalaListener = null;

  function abrir(opts) {
    injetarCSS();
    const phone = document.getElementById('phone');
    if (!phone) return;
    const velho = document.getElementById('viewer');
    if (velho) velho.remove();

    const v = document.createElement('div');
    v.className = 'viewer';
    v.id = 'viewer';
    v.innerHTML =
      '<div class="viewer-bar">' +
      '<button class="ib" id="v-close" aria-label="Fechar">' + ic.arrowLeft + '</button>' +
      '<div class="vtitle">' + esc(opts.titulo || 'Documento') + '</div>' +
      '<button class="ib" id="v-print" title="Imprimir" aria-label="Imprimir">' + ic.printer + '</button>' +
      '<button class="ib" id="v-dl" title="Baixar PDF" aria-label="Baixar PDF">' + ic.download + '</button>' +
      '</div>' +
      '<div class="viewer-body" id="v-body">' +
      '<div class="paper-wrap" id="v-wrap"><div class="paper" id="v-paper">' + opts.html + '</div></div>' +
      '<p class="viewer-tip">Toque em <b>Baixar PDF</b> para guardar o arquivo, ou em <b>Imprimir</b> para imprimir.</p>' +
      '</div>';
    phone.appendChild(v);

    const body = document.getElementById('v-body');
    const paper = document.getElementById('v-paper');
    const wrap = document.getElementById('v-wrap');

    function escalar() {
      const largura = Math.max(200, body.clientWidth - 20);
      const z = Math.min(1, largura / (paper.offsetWidth || 794));
      paper.style.transform = 'scale(' + z + ')';
      wrap.style.width = Math.round((paper.offsetWidth || 794) * z) + 'px';
      wrap.style.height = Math.round((paper.offsetHeight || 1123) * z) + 'px';
    }
    const fechar = () => {
      if (escalaListener) { window.removeEventListener('resize', escalaListener); escalaListener = null; }
      v.remove();
    };
    $('#v-close').addEventListener('click', fechar);
    $('#v-print').addEventListener('click', () => imprimir(opts.html));
    $('#v-dl').addEventListener('click', () => {
      if (typeof opts.pdf === 'function') opts.pdf();
    });
    escalaListener = escalar;
    window.addEventListener('resize', escalar);
    requestAnimationFrame(() => { escalar(); escalar(); });
    setTimeout(escalar, 120);
  }

  /* ---------- Impressão ---------- */
  function imprimir(html) {
    const fr = document.createElement('iframe');
    fr.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0');
    document.body.appendChild(fr);
    try {
      const d = fr.contentWindow.document;
      d.open();
      d.write('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Fluxo</title><style>' +
        '@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff}' +
        'body{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
        DOC_CSS +
        '.doc-page{min-height:0}' +
        '.paper{width:210mm;min-height:297mm;background:#fff;position:relative}' +
        '</style></head><body><div class="paper">' + html + '</div></body></html>');
      d.close();
      setTimeout(() => {
        try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { }
        setTimeout(() => { try { fr.remove(); } catch (e) { } }, 2500);
      }, 350);
    } catch (e) {
      FL.toast('Não foi possível abrir a impressão.', { tipo: 'erro' });
    }
  }

  /* ---------- PDF (jsPDF) ---------- */
  const pdfTxt = s => String(s == null ? '' : s)
    .replace(/[—–]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x00-\xFF]/g, '?');

  function novoDocPDF(d) {
    const lib = window.jspdf && window.jspdf.jsPDF;
    if (!lib) {
      FL.toast('A biblioteca de PDF não carregou. Use "Imprimir" para salvar em PDF.', { tipo: 'erro' });
      return null;
    }
    const doc = new lib({ unit: 'mm', format: 'a4' });
    const M = 15, W = 210, BOT = 276;
    const fs = clampFs(d.fs);
    const ctx = { doc, M, W, BOT, fs, y: 0, titulo: d.titulo || 'Documento', sub: d.sub || '' };

    ctx.cabecalho = function (comTitulo) {
      const { doc } = ctx;
      doc.setFillColor(13, 148, 136);
      doc.rect(0, 0, W, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Fluxo', M, 9.6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.6);
      doc.text(pdfTxt(ctx.titulo), W - M, 9.6, { align: 'right' });

      let y = 25;
      if (comTitulo) {
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(pdfTxt(ctx.titulo), M, y);
        y += 7;
        if (ctx.sub) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.4);
          doc.setTextColor(75, 85, 99);
          doc.text(pdfTxt(ctx.sub), M, y);
          y += 4;
        }
        doc.setDrawColor(17, 24, 39);
        doc.setLineWidth(0.5);
        doc.line(M, y + 1.5, W - M, y + 1.5);
        y += 7;
      }
      ctx.y = y;
      return y;
    };

    ctx.quebra = function (altura) {
      if (ctx.y + altura > BOT) {
        ctx.doc.addPage();
        ctx.cabecalho(false);
      }
    };
    return ctx;
  }

  function finalizarPDF(ctx, nomeArquivo, rodape) {
    const { doc } = ctx;
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(100, 116, 139);
      doc.text(pdfTxt(rodape), ctx.M, 288);
      doc.text('Página ' + i + ' de ' + total, ctx.W - ctx.M, 288, { align: 'right' });
    }
    doc.save(nomeArquivo);
  }

  const nomeSeguro = s => String(s || '').replace(/[^\w\-]+/g, '-');

  function baixar(tipo, d) {
    const ctx = novoDocPDF({
      fs: d.fs,
      titulo: tipo === 'faa' ? 'Fichas FAA' : tipo === 'same' ? 'Lista de Pastas / SAME' : 'Guarda Provisória',
      sub: ''
    });
    if (!ctx) return;
    const { doc, M, W } = ctx;
    const fs = ctx.fs;
    const hoje = fmt.dtBR(fmt.hojeIso());
    let rodape = 'Fluxo · ' + (d.usuario || d.responsavel || '') + ' · gerado em ' + new Date().toLocaleString('pt-BR');

    if (tipo === 'faa') {
      ctx.titulo = 'Fichas FAA';
      ctx.sub = (d.pacientes || []).length + ' paciente(s)' +
        (d.responsavel ? ' · Responsável: ' + d.responsavel : '') +
        (d.dataPedido ? ' · Pedido em ' + fmt.dtBR(d.dataPedido) + ' · Prazo ' + fmt.dtBR(fmt.somaDias(d.dataPedido, FL.status.PRAZO)) : '');
      ctx.cabecalho(true);
      const cols = 3;
      const colW = (W - 2 * M) / cols;
      const lh = Math.max(4.6, fs * 0.42 + 1.6);
      const rowH = Math.max(5.4, fs * 0.42 + 2.4);

      (d.pacientes || []).filter(p => p && String(p.nome || '').trim()).forEach(p => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fs + 1);
        const nomeLinhas = doc.splitTextToSize(pdfTxt(p.nome), W - 2 * M);
        const rows = Math.ceil((p.datas || []).length / cols);
        const altura = nomeLinhas.length * lh + rows * rowH + 7;
        ctx.quebra(altura);
        doc.setTextColor(17, 24, 39);
        nomeLinhas.forEach((t, i) => doc.text(t, M, ctx.y + i * lh));
        ctx.y += nomeLinhas.length * lh + 0.6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fs);
        (p.datas || []).slice().sort().forEach((iso, i) => {
          const c = i % cols, r = Math.floor(i / cols);
          const x = M + c * colW;
          const y = ctx.y + r * rowH;
          doc.setDrawColor(17, 24, 39);
          doc.setLineWidth(0.3);
          doc.rect(x, y - 3, 3.3, 3.3);
          doc.text(pdfTxt(fmt.dtBR(iso)), x + 5.2, y);
        });
        ctx.y += rows * rowH + 3.5;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(M, ctx.y, W - M, ctx.y);
        ctx.y += 3;
      });
      if (!(d.pacientes || []).length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text('Nenhum paciente informado.', M, ctx.y + 6);
      }
    }

    if (tipo === 'same') {
      ctx.titulo = 'Lista de Pastas / SAME';
      ctx.sub = (d.usuario || '') + ' · ' + (d.itens || []).length + ' pasta(s) · ' + hoje;
      ctx.cabecalho(true);
      const x0 = 9;
      (d.itens || []).forEach(it => {
        const num = String(it.same || '').trim();
        const nome = String(it.nome || '').trim();
        if (!num && !nome) return;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fs);
        const numW = num ? doc.getTextWidth(num) + 3 : 0;
        const sep = num && nome ? doc.getTextWidth(' - ') + 1 : 0;
        const larguraNome = Math.max(40, W - 2 * M - x0 - numW - sep);
        const nomeLinhas = nome ? doc.splitTextToSize(pdfTxt(nome), larguraNome) : [];
        const altura = Math.max(1, nomeLinhas.length) * (fs * 0.44 + 1.5) + 3.4;
        ctx.quebra(altura);
        doc.setDrawColor(17, 24, 39);
        doc.setLineWidth(0.3);
        doc.rect(M, ctx.y - 3, 3.3, 3.3);
        doc.setTextColor(17, 24, 39);
        let x = M + x0;
        if (num) {
          doc.setFont('helvetica', 'bold');
          doc.text(pdfTxt(num), x, ctx.y);
          x += numW;
        }
        doc.setFont('helvetica', 'normal');
        nomeLinhas.forEach((t, i) => doc.text(t, x + (i === 0 ? 0 : 0), ctx.y + i * (fs * 0.44 + 1.5)));
        ctx.y += Math.max(1, nomeLinhas.length) * (fs * 0.44 + 1.5) + 1.4;
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.2);
        doc.line(M, ctx.y - 0.6, W - M, ctx.y - 0.6);
        ctx.y += 2;
      });
    }

    if (tipo === 'prov') {
      ctx.titulo = 'Guarda Provisória';
      ctx.sub = 'Provisória de ' + (d.usuario || '') + ' · ' + (d.numeros || []).length + ' pasta(s) · ' + hoje;
      ctx.cabecalho(true);
      const cols = 2;
      const colW = (W - 2 * M) / cols;
      const step = fs * 0.44 + 5;
      const nums = (d.numeros || []).filter(n => String(n).trim());
      const linhas = Math.ceil(nums.length / cols);
      for (let r = 0; r < linhas; r++) {
        ctx.quebra(step + 2);
        nums.slice(r * cols, r * cols + cols).forEach((n, c) => {
          const x = M + c * colW;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(fs);
          doc.setTextColor(17, 24, 39);
          doc.text(pdfTxt('Pasta: ' + n), x, ctx.y);
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.2);
          doc.line(x, ctx.y + 1.8, x + colW - 6, ctx.y + 1.8);
        });
        ctx.y += step;
      }
      if (!nums.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text('Nenhum número informado.', M, ctx.y + 6);
      }
    }

    const nome = 'Fluxo-' + tipo.toUpperCase() + '-' + nomeSeguro(hoje).replace(/\//g, '-') + '.pdf';
    finalizarPDF(ctx, nome, rodape);
    FL.toast('PDF gerado com sucesso.');
  }

  /* ---------- Abrir cada tipo ---------- */
  function abrirFAA(d) {
    const html = faaHTML(d);
    abrir({
      titulo: 'Fichas FAA', html,
      pdf: () => baixar('faa', d)
    });
  }
  function abrirSAME(d) {
    const html = sameHTML(d);
    abrir({
      titulo: 'Pastas / SAME', html,
      pdf: () => baixar('same', d)
    });
  }
  function abrirPROV(d) {
    const html = provHTML(d);
    abrir({
      titulo: 'Provisória', html,
      pdf: () => baixar('prov', d)
    });
  }

  /* ---------- Exporta ---------- */
  FL.doc = {
    inject: injetarCSS,
    faaDoc, sameDoc, provDoc,
    faaHTML, sameHTML, provHTML,
    abrir, abrirFAA, abrirSAME, abrirPROV,
    imprimir, baixar, clampFs
  };
  injetarCSS();
})(window.FL);

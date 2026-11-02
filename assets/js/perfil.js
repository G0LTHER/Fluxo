/* =====================================================================
   FLUXO (site) · perfil.js — meu perfil, configurações, pessoas e autenticador
   ===================================================================== */
(function () {
  'use strict';
  const $ = FL.$, esc = FL.esc, ic = FL.ic, fmt = FL.fmt, Data = FL.data;

  let sess = null;
  let fotoNova = null; // foto escolhida, ainda não guardada

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    sess = FL.guard();
    if (!sess) return;

    FL.shell({ page: 'perfil', title: 'Meu Perfil', sub: 'Sua conta' });

    document.querySelectorAll('[data-view]').forEach(b => {
      b.addEventListener('click', () => mostrar(b.dataset.view));
    });

    const temaSeg = document.querySelector('[data-tema-seg]');
    if (temaSeg) {
      temaSeg.addEventListener('click', e => {
        const b = e.target.closest('[data-tema]');
        if (b) FL.theme.set(b.dataset.tema);
      });
    }

    $('#btn-sair').addEventListener('click', () => FL.sair());
    $('#btn-foto').addEventListener('click', () => $('#cfg-file').click());
    $('#cfg-file').addEventListener('change', e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) escolherFoto(f);
    });
    $('#cfg-trocar').addEventListener('click', () => $('#cfg-file').click());
    $('#cfg-salvar').addEventListener('click', salvarConfig);
    $('#cfg-gerar').addEventListener('click', gerarCodigo);

    $('#pp-add').addEventListener('click', adicionarPessoa);
    $('#pp-user').addEventListener('keydown', e => { if (e.key === 'Enter') adicionarPessoa(); });
    $('#pp-lista').addEventListener('click', e => {
      const b = e.target.closest('[data-rm]');
      if (b) removerPessoa(b.dataset.rm);
    });

    const hash = location.hash.replace('#', '');
    mostrar(hash === 'config' || hash === 'pessoas' ? hash : 'perfil');
  }

  /* ---------------- Navegação entre telas ---------------- */
  function voltarMenu() {
    let p = 'dashboard';
    try { p = localStorage.getItem('fluxo_ultima_pagina') || 'dashboard'; } catch (e) { }
    const mapa = { dashboard: 'menu.html', faas: 'menu.html', pasta: 'menu.html', provisoria: 'menu.html' };
    location.href = mapa[p] || 'menu.html';
  }

  function mostrar(v) {
    ['perfil', 'config', 'pessoas'].forEach(x => {
      $('#view-' + x).hidden = x !== v;
    });

    FL.$$('#site-sidebar [data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v));

    if (v === 'perfil') {
      FL.topbar({ title: 'Meu Perfil', sub: 'Sua conta', back: true, onBack: voltarMenu });
      renderPerfil();
    } else if (v === 'config') {
      FL.topbar({ title: 'Configurações', sub: 'Seus dados e segurança', back: true, onBack: () => mostrar('perfil') });
      preencherConfig();
    } else {
      FL.topbar({ title: 'Pessoas', sub: 'Adicionar e remover', back: true, onBack: () => mostrar('perfil') });
      renderPessoas();
    }
    const c = $('#content');
    if (c) c.scrollTop = 0;
  }

  /* ---------------- Perfil (raiz) ---------------- */
  function renderPerfil() {
    const p = Data.perfil();
    const d = Data.get();

    $('#p-foto').src = FL.avatar(p.foto, p.nome);
    $('#p-nome').textContent = p.nome;
    $('#p-user').textContent = '@' + p.usuario;
    $('#st-abertas').textContent = d.faas.filter(f => f.status !== 'concluido').length;
    $('#st-concluidas').textContent = d.faas.filter(f => f.status === 'concluido').length;
    $('#st-pessoas').textContent = d.pessoas.length;

    const pessoas = Data.pessoas();
    $('#people-row').innerHTML = pessoas.length
      ? pessoas.slice(0, 12).map(p =>
        '<div class="person" title="@' + esc(p.usuario) + '">' +
        '<span class="pav"><img src="' + esc(FL.avatar(p.foto, p.nome)) + '" alt="">' +
        (p.online ? '<i class="on"></i>' : '') + '</span>' +
        '<b>' + esc(p.nome || p.usuario) + '</b>' +
        '<span>@' + esc(p.usuario) + '</span>' +
        '</div>').join('')
      : '<div class="mut-sm" style="padding:10px 2px">Nenhuma pessoa ainda. Toque em <b>Gerenciar</b> para adicionar pelo @.</div>';
  }

  /* ---------------- Configurações ---------------- */
  function preencherConfig() {
    const p = Data.perfil();
    fotoNova = null;
    $('#cfg-foto').src = FL.avatar(p.foto, p.nome);
    $('#cfg-nome').value = p.nome || '';
    $('#cfg-usuario').value = p.usuario || '';
    $('#cfg-email').value = p.email || '';
    $('#cfg-senha').value = '';
    $('#cfg-senha2').value = '';
    $('#cfg-codigo').innerHTML = '';
  }

  function escolherFoto(file) {
    if (!file.type || !/^image\//.test(file.type)) return FL.toast('Escolha um arquivo de imagem.', { tipo: 'erro' });
    if (file.size > 15 * 1024 * 1024) return FL.toast('Imagem muito grande (máximo 15 MB).', { tipo: 'erro' });

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const S = 256;
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const m = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
      URL.revokeObjectURL(url);
      fotoNova = c.toDataURL('image/jpeg', 0.85);
      $('#cfg-foto').src = fotoNova;
      FL.toast('Foto escolhida. Toque em Salvar alterações.');
    };
    img.onerror = () => { URL.revokeObjectURL(url); FL.toast('Não foi possível ler essa imagem.', { tipo: 'erro' }); };
    img.src = url;
  }

  function emailOk(v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  function migrarContaLocal(antigo, novo) {
    if (!antigo || antigo === novo) return true;
    try {
      const contas = JSON.parse(localStorage.getItem('fluxo_contas_v3') || '{}');
      if (!contas[antigo]) return true; // conta existe só na nuvem
      if (contas[novo]) return false;
      contas[novo] = Object.assign({}, contas[antigo], { usuario: novo });
      delete contas[antigo];
      localStorage.setItem('fluxo_contas_v3', JSON.stringify(contas));

      const oldKey = 'fluxo_data_v3::' + antigo;
      const newKey = 'fluxo_data_v3::' + novo;
      const raw = localStorage.getItem(oldKey);
      if (raw != null && localStorage.getItem(newKey) == null) {
        localStorage.setItem(newKey, raw);
        localStorage.removeItem(oldKey);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async function salvarConfig() {
    const nome = $('#cfg-nome').value.trim();
    const usuario = FL.normalizarUsuario($('#cfg-usuario').value);
    const email = $('#cfg-email').value.trim();
    const s1 = $('#cfg-senha').value;
    const s2 = $('#cfg-senha2').value;

    if (nome.length < 2) return FL.toast('Informe o seu nome.', { tipo: 'erro' });
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) return FL.toast('O @ deve ter de 3 a 30 caracteres válidos.', { tipo: 'erro' });
    if (!emailOk(email)) return FL.toast('E-mail inválido.', { tipo: 'erro' });

    if (s1 || s2) {
      if (String(s1).length < 6) return FL.toast('A senha precisa ter ao menos 6 caracteres.', { tipo: 'erro' });
      if (!/[^A-Za-z0-9]/.test(s1)) return FL.toast('Inclua ao menos 1 caractere especial na senha.', { tipo: 'erro' });
      if (s1 !== s2) return FL.toast('As senhas não coincidem.', { tipo: 'erro' });
    }

    const atual = Data.perfil();
    const s = FL.sessao.raw() || {};

    // troca de @ (conta local): migra contas e dados
    if (!s.sb && atual.usuario && atual.usuario !== usuario) {
      if (!migrarContaLocal(atual.usuario, usuario)) {
        return FL.toast('Esse @ já está em uso por outra conta.', { tipo: 'erro' });
      }
      FL.sessao.patch({ uid: usuario, usuario: usuario });
    }

    if (s1) {
      FL.auth.trocarSenha(usuario, s1);
      if (s.sb && FL.sb) {
        try { await FL.sb.auth.updateUser({ password: s1 }); } catch (e) { }
      }
    }

    const campos = { nome: nome, usuario: usuario, email: email };
    if (fotoNova) campos.foto = fotoNova;
    Data.salvarPerfil(campos);

    FL.toast('Alterações salvas!');
    mostrar('perfil');
  }

  /* ---------------- Autenticador (código de recuperação) ---------------- */
  async function gerarCodigo() {
    const p = Data.perfil();
    let codigo = '';

    if (FL.sessaoNuvem()) {
      try {
        const r = await Promise.race([
          Promise.resolve(FL.sb.rpc('gerar_codigo_recuperacao')),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
        ]);
        if (r && r.data) codigo = r.data;
      } catch (e) { }
    }

    if (!codigo && FL.auth.contas()[FL.normalizarUsuario(p.usuario)]) {
      codigo = FL.auth.novoCodigo(p.usuario);
    }

    if (!codigo) {
      return FL.toast('Não foi possível gerar o código agora. Verifique a internet e tente de novo.', { tipo: 'erro' });
    }

    const sh = FL.sheet({
      title: 'Código de recuperação',
      sub: 'Guarde agora. Ele aparece só desta vez e vale uma vez.',
      body: '<div class="code-box" id="codigo-novo">' + esc(codigo) + '</div>' +
        '<div class="sheet-actions">' +
        '<button type="button" class="btn outline" data-copiar>' + ic.copy + 'Copiar</button>' +
        '<button type="button" class="btn primary" data-baixar>' + ic.download + 'Baixar .txt</button>' +
        '</div>'
    });
    sh.body.querySelector('[data-copiar]').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(codigo);
        FL.toast('Código copiado!');
      } catch (e) {
        FL.toast('Selecione o código e copie manualmente.', { tipo: 'erro' });
      }
    });
    sh.body.querySelector('[data-baixar]').addEventListener('click', () => {
      const txt = 'Fluxo - código de recuperação de senha\nUsuário: @' + p.usuario +
        '\nCódigo: ' + codigo + '\nGerado em: ' + new Date().toLocaleString('pt-BR') +
        '\n\nGuarde em local seguro. Vale uma vez só.';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
      a.download = 'codigo-recuperacao-' + p.usuario + '.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }

  /* ---------------- Pessoas ---------------- */
  function renderPessoas() {
    const pessoas = Data.pessoas();
    $('#pp-count').textContent = pessoas.length ? pessoas.length + ' pessoa(s)' : '';

    if (!pessoas.length) {
      $('#pp-lista').innerHTML = '<div class="empty"><div class="eico">' + ic.users + '</div>' +
        '<b>Nenhuma pessoa adicionada</b><p>Adicione alguém pelo @ para ver as atividades e conversar.</p></div>';
      return;
    }

    $('#pp-lista').innerHTML = pessoas.map(p =>
      '<div class="saved">' +
      '<div class="saved-head">' +
      '<span class="ico" style="border-radius:50%;overflow:hidden;background:var(--pri-soft)"><img src="' + esc(FL.avatar(p.foto, p.nome)) + '" alt="" style="width:100%;height:100%;object-fit:cover"></span>' +
      '<div class="inf"><b>' + esc(p.nome || p.usuario) + '</b>' +
      '<span>@' + esc(p.usuario) + ' · ' + (p.online ? '<span style="color:var(--green)">online</span>' : 'offline') + '</span></div>' +
      '<button type="button" class="btn-xs danger" data-rm="' + esc(p.usuario) + '">Remover</button>' +
      '</div>' +
      '</div>').join('');
  }

  async function adicionarPessoa() {
    const u = FL.normalizarUsuario($('#pp-user').value);
    if (!u) return FL.toast('Informe o @ da pessoa.', { tipo: 'erro' });

    let r = null;
    if (FL.sessaoNuvem()) {
      try {
        const resp = await Promise.race([
          Promise.resolve(FL.sb.rpc('adicionar_contato', { p_usuario: u })),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
        ]);
        if (resp && !resp.error && resp.data === 'ok') r = { ok: true };
        else if (resp && resp.data) {
          const msgs = {
            nao_encontrado: 'Não existe ninguém com o @' + u + '.',
            voce_mesmo: 'Você não precisa se adicionar.',
            ja_adicionado: '@' + u + ' já está na sua lista.'
          };
          return FL.toast(msgs[resp.data] || 'Não foi possível adicionar.', { tipo: 'erro' });
        }
      } catch (e) { }
    }

    if (!r) {
      const contas = FL.auth.contas();
      const c = contas[u];
      if (!c) return FL.toast('Não encontrei esse @. A pessoa precisa já ter criado conta no Fluxo.', { tipo: 'erro' });
      r = Data.addPessoa({ usuario: u, nome: c.nome || u, foto: '', online: false });
      if (!r.ok) return FL.toast(r.erro, { tipo: 'erro' });
    }

    $('#pp-user').value = '';
    renderPessoas();
    renderPerfil();
    FL.toast('@' + u + ' adicionado! Vocês agora veem um ao outro.');
  }

  async function removerPessoa(u) {
    const ok = await FL.confirm('Remover @' + u + ' da sua lista? Vocês deixam de ver as atividades um do outro.', {
      ok: 'Remover', danger: true, title: 'Remover pessoa'
    });
    if (!ok) return;
    Data.removerPessoa(u);
    if (FL.sessaoNuvem()) {
      try { FL.sb.rpc('remover_contato', { p_usuario: u }).then(() => { }, () => { }); } catch (e) { }
    }
    renderPessoas();
    renderPerfil();
    FL.toast('@' + u + ' removido.');
  }

  window.FluxoPages = window.FluxoPages || {};
  window.FluxoPages.perfil = { mostrar: mostrar };
})();

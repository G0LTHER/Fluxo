/* =====================================================================
   FLUXO (site) · login.js — entrar, criar conta, esqueci a senha
   (mantém o visual do cartão de login da fluxo-web)
   ===================================================================== */
(function () {
  'use strict';
  const $ = FL.$;
  let modo = 'entrar';
  let ocupado = false;

  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
  function erroSenha(s) {
    if (String(s || '').length < 6) return 'A senha precisa ter ao menos 6 caracteres.';
    if (!/[^A-Za-z0-9]/.test(String(s))) return 'Inclua ao menos um caractere especial (ex.: !, @, #).';
    return '';
  }
  function comTimeout(p, ms) {
    return Promise.race([
      Promise.resolve(p),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms || 7000))
    ]);
  }

  function msg(t, ok) {
    const el = $('#auth-msg');
    el.textContent = t || '';
    el.style.color = ok ? '#059669' : '#dc2626';
  }

  function ocupar(v) {
    ocupado = v;
    $('#btn-auth').disabled = v;
    $('#btn-auth').textContent = v ? 'A aguardar...' : (modo === 'cadastro' ? 'Criar conta' : modo === 'reset' ? 'Redefinir senha' : 'Entrar');
  }

  function setModo(m) {
    modo = m;
    const cad = m === 'cadastro';
    const rst = m === 'reset';

    $('#nome-input').style.display = cad ? '' : 'none';
    $('#sobrenome-input').style.display = cad ? '' : 'none';
    $('#email-cad-input').style.display = cad ? '' : 'none';
    $('#wrap-senha2').style.display = (cad || rst) ? '' : 'none';
    $('#codigo-input').style.display = rst ? '' : 'none';
    const manter = $('#wrap-manter');
    if (manter) manter.style.display = rst ? 'none' : '';

    $('#nome-input').required = cad;
    $('#sobrenome-input').required = cad;
    $('#email-cad-input').required = cad;
    $('#senha2-input').required = cad;

    $('#senha-input').placeholder = rst ? 'Nova senha (mín. 6 com 1 caractere especial)' : (cad ? 'Crie uma senha' : 'Senha');
    $('#username-input').placeholder = cad ? 'Escolha seu @ (ex.: maria.silva)' : 'Utilizador ou E-mail';
    $('#codigo-input').placeholder = 'Código de recuperação (FLX-XXXX-XXXX)';

    $('#btn-auth').textContent = cad ? 'Criar conta' : rst ? 'Redefinir senha' : 'Entrar';
    $('#btn-modo').textContent = m === 'entrar' ? 'Criar conta' : 'Já tenho conta';
    $('#btn-esq').style.display = m === 'entrar' ? '' : 'none';
    $('#login-titulo').textContent = cad ? 'Criar conta' : rst ? 'Recuperar senha' : 'Acessar o Fluxo';
    $('#login-sub').textContent = cad
      ? 'Preencha os dados de cadastro. O seu @ será o seu login.'
      : rst
        ? 'Informe o utilizador, o código de recuperação e a nova senha.'
        : 'Entre com o seu utilizador e senha.';
    msg('');
    setTimeout(() => {
      try {
        const primeiro = cad ? $('#nome-input') : $('#username-input');
        primeiro.focus();
      } catch (e) { }
    }, 350);
  }

  /* ---------------- Ações ---------------- */
  async function cadastrar() {
    const nome = ($('#nome-input').value.trim() + ' ' + $('#sobrenome-input').value.trim()).trim();
    const raw = $('#username-input').value.trim();
    const emailInput = $('#email-cad-input').value.trim();
    const senha = $('#senha-input').value;
    const senha2 = $('#senha2-input').value;
    const usuario = FL.normalizarUsuario(raw.split('@')[0]);

    if (nome.length < 2) return msg('Informe o seu nome completo.');
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) return msg('O @ deve ter de 3 a 30 caracteres (letras, números, ponto, hífen).');
    if (!emailOk(emailInput)) return msg('Informe um e-mail válido.');
    const e1 = erroSenha(senha); if (e1) return msg(e1);
    if (senha !== senha2) return msg('As senhas não coincidem.');

    ocupar(true);
    msg('A criar a sua conta...', true);

    let sbSessao = null, sbErro = '';

    if (FL.sb) {
      try {
        const r = await comTimeout(FL.sb.auth.signUp({
          email: emailInput,
          password: senha,
          options: { data: { usuario: usuario, nome: nome } }
        }));
        if (r && r.error) sbErro = r.error.message || '';
        else if (r && r.data) sbSessao = r.data.session || null;
      } catch (err) {
        sbErro = 'offline';
      }
    }

    if (sbErro && /already|exist|registered|em uso/i.test(sbErro)) {
      ocupar(false);
      return msg('Esse e-mail já está cadastrado. Use "Entrar" ou "Esqueci a senha".');
    }

    const local = FL.auth.registrar({ nome: nome, usuario: usuario, email: emailInput, senha: senha });
    if (!local.ok && !sbSessao) {
      ocupar(false);
      return msg(local.erro);
    }

    if (sbSessao) {
      const u = sbSessao.user || {};
      FL.sessao.criar({
        uid: u.id, usuario: usuario, nome: nome, email: emailInput,
        foto: '', manter: $('#in-manter').checked, sb: true
      });
      FL.store.update(st => { st.perfil = { nome: nome, usuario: usuario, email: emailInput, foto: '' }; });
      location.href = 'menu.html';
      return;
    }

    ocupar(false);
    setModo('entrar');
    $('#username-input').value = usuario;
    $('#senha-input').value = '';
    msg('Conta criada! Entre com a sua senha.', true);
  }

  async function entrar() {
    const raw = $('#username-input').value.trim();
    const senha = $('#senha-input').value;
    const usuario = FL.normalizarUsuario(raw.split('@')[0]);
    const manter = $('#in-manter').checked;

    if (!usuario) return msg('Informe o seu utilizador ou e-mail.');
    if (!senha) return msg('Informe a sua senha.');

    try { localStorage.setItem('fluxo_manter', manter ? '1' : '0'); } catch (e) { }

    ocupar(true);
    msg('A entrar...', true);

    const email = raw.includes('@') && raw.indexOf('@') > 0 ? raw : usuario + '@fluxo.com';
    let sess = null;

    if (FL.sb) {
      try {
        const r = await comTimeout(FL.sb.auth.signInWithPassword({ email: email, password: senha }));
        if (r && r.data && r.data.session) {
          const u = r.data.user || {};
          const meta = u.user_metadata || {};
          sess = {
            uid: u.id,
            usuario: meta.usuario || usuario,
            nome: meta.nome || meta.name || '',
            email: u.email || email,
            foto: '',
            sb: true
          };
        }
      } catch (e) { /* sem internet: tenta a conta local */ }
    }

    if (!sess) {
      const loc = FL.auth.entrar({ usuario: usuario, senha: senha });
      if (loc.ok) {
        sess = {
          uid: loc.conta.usuario,
          usuario: loc.conta.usuario,
          nome: loc.conta.nome,
          email: loc.conta.email,
          foto: '',
          sb: false
        };
      }
    }

    if (!sess) {
      ocupar(false);
      return msg('Utilizador ou senha incorretos. Verifique e tente de novo.');
    }

    await finalizar(sess, manter);
  }

  async function finalizar(sess, manter) {
    FL.sessao.criar(Object.assign({ manter: manter }, sess));

    if (sess.sb) {
      try {
        const r = await comTimeout(
          FL.sb.from('perfis').select('nome,foto,usuario,email_contato').eq('user_id', sess.uid).maybeSingle(), 3500
        );
        const p = r && r.data;
        if (p) {
          FL.store.update(st => {
            st.perfil = Object.assign(st.perfil || {}, {
              nome: p.nome || sess.nome,
              usuario: p.usuario || sess.usuario,
              email: p.email_contato || sess.email,
              foto: p.foto || ''
            });
          });
          FL.sessao.patch({
            nome: p.nome || sess.nome,
            usuario: p.usuario || sess.usuario,
            email: p.email_contato || sess.email,
            foto: p.foto || ''
          });
        }
      } catch (e) { }
    } else {
      FL.store.update(st => {
        st.perfil = Object.assign({ nome: sess.nome, usuario: sess.usuario, email: sess.email }, st.perfil || {});
      });
    }

    location.href = 'menu.html';
  }

  async function redefinir() {
    const usuario = FL.normalizarUsuario($('#username-input').value.split('@')[0]);
    const codigo = $('#codigo-input').value.trim();
    const senha = $('#senha-input').value;
    const senha2 = $('#senha2-input').value;

    if (!usuario) return msg('Informe o seu utilizador.');
    if (!codigo) return msg('Informe o código de recuperação.');
    const e1 = erroSenha(senha); if (e1) return msg(e1);
    if (senha !== senha2) return msg('As senhas não coincidem.');

    ocupar(true);
    msg('A redefinir...', true);

    let ok = false;
    if (FL.sb) {
      try {
        const r = await comTimeout(FL.sb.rpc('redefinir_senha', {
          p_usuario: usuario, p_codigo: codigo, p_nova: senha
        }));
        ok = !!(r && !r.error && r.data);
      } catch (e) { }
    }
    if (ok) FL.auth.trocarSenha(usuario, senha);
    else {
      const loc = FL.auth.redefinir({ usuario: usuario, codigo: codigo, senha: senha });
      ok = loc.ok;
      if (!ok && !FL.sb) {
        ocupar(false);
        return msg(loc.erro);
      }
    }

    ocupar(false);
    if (!ok) return msg('Utilizador ou código de recuperação incorreto.');
    const u = usuario;
    setModo('entrar');
    $('#username-input').value = u;
    $('#senha-input').value = '';
    msg('Senha alterada! Entre com a nova senha.', true);
  }

  /* ---------------- Mostrar/esconder senha ---------------- */
  window.toggleSenha = function (idInput, btn) {
    const inp = $(idInput);
    const svg = $('#icon-' + idInput);
    if (!inp) return;
    if (inp.type === 'password') {
      inp.type = 'text';
      if (svg) svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    } else {
      inp.type = 'password';
      if (svg) svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
  };

  /* ---------------- Eventos ---------------- */
  async function init() {
    if (FL.sessao.get()) { location.replace('menu.html'); return; }

    const params = new URLSearchParams(location.search);
    if (params.get('expirado')) {
      msg('Sua sessão expirou por 30 minutos de inatividade. Entre novamente.');
    }

    // sessão do Supabase ainda ativa? (voltou sem fechar)
    if (FL.sb) {
      try {
        const r = await comTimeout(FL.sb.auth.getSession(), 4000);
        if (r && r.data && r.data.session) {
          const u = r.data.session.user || {};
          const meta = u.user_metadata || {};
          FL.sessao.criar({
            uid: u.id,
            usuario: meta.usuario || ((u.email || '').split('@')[0]),
            nome: meta.nome || '',
            email: u.email || '',
            foto: '',
            manter: false,
            sb: true
          });
          location.replace('menu.html');
          return;
        }
      } catch (e) { }
    }

    try {
      if (localStorage.getItem('fluxo_manter') === '0') $('#in-manter').checked = false;
    } catch (e) { }

    $('#form-auth').addEventListener('submit', e => {
      e.preventDefault();
      if (ocupado) return;
      if (modo === 'cadastro') cadastrar();
      else if (modo === 'reset') redefinir();
      else entrar();
    });

    $('#btn-modo').addEventListener('click', () => setModo(modo === 'cadastro' ? 'entrar' : 'cadastro'));
    $('#btn-esq').addEventListener('click', () => setModo('reset'));

    $('#btn-demo').addEventListener('click', () => {
      const s = FL.loginDemo();
      if (!s) return msg('Conta de demonstração indisponível.');
      location.href = 'menu.html';
    });

    setModo('entrar');
  }

  document.addEventListener('DOMContentLoaded', init);
})();

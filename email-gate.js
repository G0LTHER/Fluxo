/* Fluxo — e-mail de recuperação: pede e confirma o e-mail ao entrar (menu) e permite alterar (perfil). */
(function () {
  if (window.__fxEmailGate) return; window.__fxEmailGate = 1;
  var cli = function () { try { return typeof db !== 'undefined' ? db : null; } catch (e) { return null; } };
  var esc = function (s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var st = document.createElement('style');
  st.textContent = '.fxg-fundo{position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,10,20,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}' +
    '.fxg-box{width:100%;max-width:420px;max-height:92dvh;overflow:auto;padding:24px;border-radius:28px;background:var(--card,#fff);color:var(--tx,#111);box-shadow:0 24px 60px rgba(0,0,0,.35)}' +
    '.fxg-box h3{margin:0 0 8px;font-size:22px}.fxg-box p{margin:0 0 16px;font-size:14px;line-height:1.45;color:var(--mut,#666)}' +
    '.fxg-box input{width:100%;box-sizing:border-box;margin-bottom:12px;padding:14px 16px;font-size:16px;border:1px solid var(--bd,#ddd);border-radius:14px;background:var(--bg,#fff);color:var(--tx,#111)}' +
    '.fxg-box .btn,.fxg-box .ghost{width:100%;margin-top:8px}.fxg-msg{min-height:20px;margin:0 0 8px;font-size:13px;font-weight:600}' +
    '.fxg-msg.e{color:#e5484d}.fxg-msg.o{color:#16a34a}.fxg-cod{text-align:center;letter-spacing:8px;font-size:24px!important;font-weight:700}';
  document.head.appendChild(st);

  var el = null, estado = { email: '', fechavel: false };
  function fechar() { if (el) { el.remove(); el = null; } }
  function msg(t, ok) { var m = el && el.querySelector('.fxg-msg'); if (m) { m.textContent = t || ''; m.className = 'fxg-msg ' + (ok ? 'o' : 'e'); } }
  function abrir(html) {
    if (!el) { el = document.createElement('div'); el.className = 'fxg-fundo'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); }
    el.innerHTML = '<div class="fxg-box">' + html + '</div>';
  }
  var fecharBtn = function () { return estado.fechavel ? '<button type="button" class="ghost" data-a="fechar">Cancelar</button>' : ''; };

  function telaEmail(prefill) {
    abrir('<h3>E-mail de recuperação</h3><p>Cadastre um e-mail para poder redefinir a senha caso você esqueça. Sem ele, não é possível recuperar a conta.</p>' +
      '<input type="email" id="fxg-email" placeholder="seuemail@exemplo.com" autocomplete="email" value="' + esc(prefill) + '">' +
      '<div class="fxg-msg"></div><button type="button" class="btn" data-a="enviar">Enviar código</button>' + fecharBtn());
  }
  function telaCodigo() {
    abrir('<h3>Digite o código</h3><p>Enviamos um código de 6 dígitos para <b>' + esc(estado.email) + '</b>. Ele vale por 10 minutos.</p>' +
      '<input type="text" id="fxg-cod" class="fxg-cod" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code">' +
      '<div class="fxg-msg"></div><button type="button" class="btn" data-a="confirmar">Confirmar</button>' +
      '<button type="button" class="ghost" data-a="reenviar">Reenviar código</button><button type="button" class="ghost" data-a="trocar">Trocar e-mail</button>');
  }

  async function enviar() {
    var c = cli(), e = (document.getElementById('fxg-email') || {}).value;
    e = (e || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return msg('Digite um e-mail válido.');
    msg('Enviando...', true);
    var r = await c.functions.invoke('recuperar-senha', { body: { acao: 'confirmar', email: e } });
    if (r.error) {
      var j = null; try { j = await r.error.context.json(); } catch (x) {}
      var c0 = j && j.erro;
      if (c0 === 'aguarde') { estado.email = e; telaCodigo(); return msg('Um código já foi enviado há pouco. Aguarde 1 minuto para reenviar.', true); }
      if (c0 === 'email_invalido') return msg('Digite um e-mail válido.');
      // serviço fora do ar: não deixa a pessoa presa
      var m = el.querySelector('.fxg-msg'); msg('Não foi possível enviar o e-mail agora. Tente de novo em instantes.');
      if (!estado.fechavel && !el.querySelector('[data-a=pular]')) m.insertAdjacentHTML('afterend', '<button type="button" class="ghost" data-a="pular">Continuar sem confirmar por agora</button>');
      return;
    }
    estado.email = e; telaCodigo();
  }
  async function confirmar() {
    var cod = ((document.getElementById('fxg-cod') || {}).value || '').replace(/\D/g, '');
    if (cod.length !== 6) return msg('Digite os 6 dígitos.');
    var r = await cli().rpc('confirmar_email', { p_codigo: cod });
    var t = r.data;
    if (r.error) return msg('Erro ao confirmar. Tente de novo.');
    if (t === 'ok') { abrir('<h3>E-mail confirmado!</h3><p>Agora você pode recuperar a senha por e-mail.</p><button type="button" class="btn" data-a="fechar">Continuar</button>'); estado.fechavel = true; pintar(); return; }
    msg({ incorreto: 'Código incorreto.', expirado: 'Código expirado. Peça um novo.', bloqueado: 'Muitas tentativas. Aguarde 15 minutos.', sem_codigo: 'Peça um novo código.' }[t] || 'Não foi possível confirmar.');
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-a]'); if (!b || !el || !el.contains(b)) return;
    var a = b.dataset.a;
    if (a === 'enviar') enviar();
    else if (a === 'confirmar') confirmar();
    else if (a === 'reenviar') { var i = estado.email; telaEmail(i); setTimeout(function () { enviar(); }, 0); }
    else if (a === 'trocar') telaEmail(estado.email);
    else if (a === 'pular') { try { sessionStorage.setItem('fluxo_gate_pulou', '1'); } catch (x) {} fechar(); }
    else if (a === 'fechar') fechar();
  });

  async function status() { var c = cli(); if (!c) return {}; var r = await c.rpc('meu_email_recuperacao'); return r.data || {}; }
  async function pintar() {
    var box = document.getElementById('email-rec-status'); if (!box) return;
    var s = await status();
    box.innerHTML = s.email
      ? (s.verificado ? '<div class="ok-box">✓ ' + esc(s.email) + ' confirmado.</div>' : '<div class="warn-box">' + esc(s.email) + ' ainda não foi confirmado.</div>')
      : '<div class="warn-box">Nenhum e-mail cadastrado.</div>';
  }

  window.abrirEmailRecuperacao = async function (fechavel) {
    estado.fechavel = !!fechavel; var s = await status(); telaEmail(s.email || '');
  };

  async function checar() {
    var c = cli(); if (!c) return;
    try {
      var ses = await c.auth.getSession(); if (!ses.data || !ses.data.session) return;
      pintar();
      if (!/menu\.html$|\/$/.test(location.pathname) && !/\/menu$/.test(location.pathname)) return;
      if (sessionStorage.getItem('fluxo_gate_pulou') === '1') return;
      var s = await status();
      if (s && s.verificado === false) { estado.fechavel = false; telaEmail(s.email || ''); }
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(checar, 1500); });
  else setTimeout(checar, 1500);
})();

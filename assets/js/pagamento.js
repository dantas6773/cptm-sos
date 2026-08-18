const seta_voltar = document.getElementById('divvoltar');


seta_voltar.addEventListener('click', function () {
  window.location.href = 'home.html';
});



async function carregarUsuario() {
  const dinheiroEl = document.getElementById('dinheiro');
  const boas = document.getElementById('boas-vindas');

  try {
    const resp = await authFetch('/api/usuario');
    if (!resp.ok) throw new Error('Erro ao buscar usuário no servidor');
    const data = await resp.json();

    const saldo = data.usuario?.saldo ?? 0;
    if (dinheiroEl) dinheiroEl.textContent = formatBRL(saldo);

    const nome = data.usuario?.nome || '';
    if (boas) boas.textContent = 'Olá, ' + (nome.split(' ')[0] || 'Usuário');
  } catch (err) {
    console.error('Erro ao carregar usuário:', err);
    if (dinheiroEl) dinheiroEl.textContent = formatBRL(0);
  }
}


document.addEventListener('DOMContentLoaded', async () => {
  await carregarUsuario();

  const metodoBtns = document.querySelectorAll('.mets');
  metodoBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'pagamento-pós.html';
    });
  });
});

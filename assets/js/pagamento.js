const seta_voltar = document.getElementById('divvoltar');


seta_voltar.addEventListener('click', function () {
  window.location.href = 'home.html';
});


function formatBRL(num) {
  return 'R$ ' + Number(num).toFixed(2).replace('.', ',');
}


async function carregarSaldo(email) {
  try {
    const resp = await fetch(`http://localhost:5001/api/usuario?email=${encodeURIComponent(email)}`);
    if (!resp.ok) throw new Error('Erro ao buscar saldo do servidor');
    const data = await resp.json();

    const saldo = data.usuario?.saldo ?? 0;
    const dinheiroEl = document.getElementById('dinheiro');
    if (dinheiroEl) dinheiroEl.textContent = formatBRL(saldo);
  } catch (err) {
    console.error('Erro ao carregar saldo:', err);
    const dinheiroEl = document.getElementById('dinheiro');
    if (dinheiroEl) dinheiroEl.textContent = formatBRL(0);
  }
}


document.addEventListener('DOMContentLoaded', async () => {
  // Garante que os dados do usuário estejam no localStorage
  if (!localStorage.getItem('usuarios')) {
    try {
      const resp = await fetch('/src/usuario.json');
      if (resp.ok) {
        const data = await resp.json();
        localStorage.setItem('usuarios', JSON.stringify(data.usuarios || []));
      }
    } catch (err) {
      console.error('Erro ao carregar usuario.json:', err);
    }
  }

  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const currentUserId = Number(localStorage.getItem('currentUserId')) || 1;
  const user = usuarios.find(u => Number(u.id) === currentUserId) || usuarios[0];

  
  if (user) {
    const boas = document.getElementById('boas-vindas');
    if (boas) {
      const nome = user.nome || '';
      boas.textContent = 'Olá, ' + (nome.split(' ')[0] || 'Usuário');
    }
  }

  
  const email = localStorage.getItem('userEmail') || (user?.email ?? null);
  if (email) {
    await carregarSaldo(email);
  }

 
  const metodoBtns = document.querySelectorAll('.mets');
  metodoBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'pagamento-pós.html';
    });
  });
});
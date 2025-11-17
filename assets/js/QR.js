document.addEventListener("DOMContentLoaded", function () {
  const botaoVoltar = document.getElementById("btn-voltar");

  botaoVoltar.addEventListener("click", function () {
    window.location.href = "home.html"; 
  });
});

document.addEventListener("DOMContentLoaded", async function () {

  async function carregarSaldoBackend() {
    const email = localStorage.getItem('userEmail');
    if (!email) {
      console.warn('Nenhum email encontrado no localStorage (userEmail).');
      return;
    }

    try {
      const resp = await fetch(`http://localhost:5001/api/usuario?email=${encodeURIComponent(email)}`);
      if (!resp.ok) throw new Error('Erro ao buscar saldo no servidor');

      const data = await resp.json();
      const saldo = data.usuario?.saldo ?? 0;
      const saldoFormatado = 'R$' + saldo.toFixed(2).replace('.', ',');

      const saldoEl = document.querySelector('.saldo');
      if (saldoEl) saldoEl.textContent = `Seu saldo: ${saldoFormatado}`;
    } catch (error) {
      console.error('Erro ao carregar saldo do backend:', error);
    }
  }

  await carregarSaldoBackend();  
});

// testado
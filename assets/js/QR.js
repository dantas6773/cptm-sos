document.addEventListener("DOMContentLoaded", function () {
  const botaoVoltar = document.getElementById("btn-voltar");

  botaoVoltar.addEventListener("click", function () {
    window.location.href = "home.html"; 
  });
});

document.addEventListener("DOMContentLoaded", async function () {

  async function carregarSaldoBackend() {
    const saldoEl = document.querySelector('.saldo');

    try {
      // A rota é protegida e tira a identidade do token — passar ?email= não autentica.
      const resp = await authFetch('/api/usuario');
      if (!resp.ok) throw new Error('Erro ao buscar saldo no servidor');

      const data = await resp.json();
      const saldo = data.usuario?.saldo ?? 0;

      if (saldoEl) saldoEl.textContent = `Seu saldo: ${formatBRL(saldo)}`;
    } catch (error) {
      console.error('Erro ao carregar saldo do backend:', error);
      if (saldoEl) saldoEl.textContent = 'Saldo indisponível';
    }
  }

  await carregarSaldoBackend();  
});

// testado
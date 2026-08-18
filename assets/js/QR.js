document.addEventListener("DOMContentLoaded", async function () {
  const botaoVoltar = document.getElementById("btn-voltar");
  const botaoCatraca = document.getElementById("btn-catraca");
  const saldoEl = document.querySelector(".saldo");
  const avisoEl = document.getElementById("aviso-catraca");

  botaoVoltar.addEventListener("click", function () {
    window.location.href = "home.html";
  });

  function mostrarSaldo(valor) {
    if (saldoEl) saldoEl.textContent = `Seu saldo: ${formatBRL(valor)}`;
  }

  function avisar(texto, tipo) {
    if (!avisoEl) return;
    avisoEl.textContent = texto;
    avisoEl.className = tipo ? `aviso ${tipo}` : "aviso";
  }

  async function carregarSaldoBackend() {
    try {
      // A rota é protegida e tira a identidade do token — passar ?email= não autentica.
      const resp = await authFetch("/api/usuario");
      if (!resp.ok) throw new Error("Erro ao buscar saldo no servidor");

      const data = await resp.json();
      mostrarSaldo(data.usuario?.saldo ?? 0);
    } catch (error) {
      console.error("Erro ao carregar saldo do backend:", error);
      if (saldoEl) saldoEl.textContent = "Saldo indisponível";
    }
  }

  // Passar na catraca desconta uma passagem do saldo. A compra de bilhetes credita;
  // é aqui que o valor sai.
  async function passarNaCatraca() {
    botaoCatraca.disabled = true;
    avisar("");

    try {
      const resp = await authFetch("/api/usuario/passagem", { method: "POST" });
      const data = await resp.json();

      if (!resp.ok) {
        mostrarSaldo(data.saldo ?? 0);
        avisar(data.mensagem || "Não foi possível liberar a passagem.", "erro");
        return;
      }

      mostrarSaldo(data.usuario?.saldo ?? 0);
      avisar(`Passagem liberada — ${formatBRL(data.preco)} descontados.`, "sucesso");
    } catch (error) {
      console.error("Erro ao passar na catraca:", error);
      avisar("Erro de conexão com o servidor.", "erro");
    } finally {
      botaoCatraca.disabled = false;
    }
  }

  if (botaoCatraca) {
    botaoCatraca.addEventListener("click", passarNaCatraca);
  }

  await carregarSaldoBackend();
});

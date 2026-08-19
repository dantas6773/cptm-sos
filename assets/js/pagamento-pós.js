// === pagamento-pós.js (versão integrada ao seu backend server.ts) ===

// Elementos principais da página
const incrementarBilhetes = document.getElementById("incrementar-bilhetes");
const decrementarBilhetes = document.getElementById("decrecimo-bilhetes");
const quantidadeBilhetes = document.getElementById("quantidade-bilhetes");
const valorBilhetes = document.getElementById("valor-bilhetes");
const comprarBotao = document.getElementById("botao-comprar");
const saldoEl = document.getElementById("dinheiro");
const voltarEl = document.getElementById("divvoltar");

let quantidade = 0;
let valor = 0;
const PRECO_BILHETE = 5.20;


// === Incrementar e decrementar bilhetes ===
incrementarBilhetes.addEventListener("click", () => {
  quantidade++;
  valor = quantidade * PRECO_BILHETE;
  quantidadeBilhetes.textContent = quantidade;
  valorBilhetes.textContent = valor.toFixed(2).replace(".", ",");
});

decrementarBilhetes.addEventListener("click", () => {
  if (quantidade > 0) {
    quantidade--;
    valor = quantidade * PRECO_BILHETE;
    quantidadeBilhetes.textContent = quantidade;
    valorBilhetes.textContent = valor.toFixed(2).replace(".", ",");
  }
});

// === Carregar saldo real do usuário ===
// O usuário vem de carregarUsuario() (auth.js), que também preenche a saudação.
async function carregarSaldo() {
  try {
    const usuario = await carregarUsuario();
    const saldo = usuario.saldo ?? 0;
    saldoEl.textContent = formatBRL(saldo);
    return saldo;
  } catch (error) {
    console.error("Erro ao carregar saldo:", error);
    saldoEl.textContent = formatBRL(0);
    return 0;
  }
}

// === Função de compra de bilhetes ===
async function comprar() {
  if (quantidade <= 0) {
    alert("Selecione uma quantidade de bilhetes.");
    return;
  }

  try {
    // O servidor calcula o total e debita; aqui só se informa a quantidade.
    const response = await authFetch("/api/usuario/compra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantidade }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.mensagem || "Erro ao realizar a compra.");
      return;
    }

    saldoEl.textContent = formatBRL(data.usuario.saldo ?? 0);
    alert(`Compra realizada! ${formatBRL(data.total)} adicionados ao seu saldo (${data.quantidade} bilhete(s)).`);
  } catch (error) {
    console.error("Erro na compra:", error);
    alert("Erro ao realizar a compra. Tente novamente.");
  }
}

// === Inicialização da página ===
document.addEventListener("DOMContentLoaded", async () => {
  // Carrega saldo real do banco de dados
  await carregarSaldo();

  // Evento de compra
  comprarBotao.addEventListener("click", comprar);

  //Botão voltar
  if (voltarEl) {
    voltarEl.style.cursor = "pointer";
    voltarEl.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "pagamento.html";
    });
  }

});

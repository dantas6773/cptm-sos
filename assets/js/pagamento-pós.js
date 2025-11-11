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

// === Função para formatar valores em reais ===
function formatBRL(num) {
  return "R$ " + Number(num).toFixed(2).replace(".", ",");
}

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
async function carregarSaldo(email) {
  try {
    const response = await fetch(`http://localhost:5001/api/usuario?email=${encodeURIComponent(email)}`);
    if (!response.ok) throw new Error("Erro ao buscar saldo no servidor");

    const data = await response.json();
    const saldo = data.usuario.saldo ?? 0;

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
  const email = localStorage.getItem("userEmail");

  if (!email) {
    alert("Usuário não logado.");
    return;
  }

  if (quantidade <= 0) {
    alert("Selecione uma quantidade de bilhetes.");
    return;
  }

  try {
    const response = await fetch("http://localhost:5001/api/usuario/saldo", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, amount: valor }),
    });

    if (!response.ok) throw new Error("Erro ao atualizar saldo.");

    const data = await response.json();
    const novoSaldo = data.usuario.saldo ?? 0;

    saldoEl.textContent = formatBRL(novoSaldo);

    alert("Compra realizada com sucesso!");
  } catch (error) {
    console.error("Erro na compra:", error);
    alert("Erro ao realizar a compra. Tente novamente.");
  }
}

// === Inicialização da página ===
document.addEventListener("DOMContentLoaded", async () => {
  const email = localStorage.getItem("userEmail");

  if (!email) {
    console.warn("Nenhum usuário logado no localStorage.");
    saldoEl.textContent = formatBRL(0);
    return;
  }

  // Carrega saldo real do banco de dados
  await carregarSaldo(email);

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

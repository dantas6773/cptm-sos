const incrementarBilhetes = document.getElementById("incrementar-bilhetes");
const decrementarBilhetes = document.getElementById("decrecimo-bilhetes");
const quantidadeBilhetes = document.getElementById("quantidade-bilhetes");
const valorBilhetes = document.getElementById("valor-bilhetes");
const comprarBotao = document.getElementById("comprar");

let quantidade = Number(quantidadeBilhetes.textContent);
let valor = Number(valorBilhetes.textContent.replace(",", "."));

// Atualiza a quantidade e o valor dos bilhetes
incrementarBilhetes.addEventListener("mousedown", (event) => {
    event.preventDefault();
    quantidade += 1;
    valor = 5.20 * quantidade;
    quantidadeBilhetes.textContent = quantidade;
    valorBilhetes.textContent = valor.toFixed(2).replace(".", ",");
});

decrementarBilhetes.addEventListener("mousedown", (event) => {
    event.preventDefault();
    if (quantidade > 0) {
        quantidade -= 1;
        valor = 5.20 * quantidade;
        quantidadeBilhetes.textContent = quantidade;
        valorBilhetes.textContent = valor.toFixed(2).replace(".", ",");
    }
});

// Ao clicar em COMPRAR
comprarBotao.addEventListener("click", async (event) => {
    event.preventDefault();
    if (quantidade <= 0 || valor <= 0) {
        alert("Selecione uma quantidade válida de bilhetes.");
        return;
    }

    const email = localStorage.getItem("userEmail"); // Corrigido para usar 'userEmail'
    if (!email) {
        alert("Usuário não logado.");
        return;
    }

    try {
        const response = await fetch("http://localhost:5001/api/usuario/saldo", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                amount: valor,
            }),
        });

        if (response.ok) {
            alert("Compra realizada com sucesso!");
            window.location.reload(); // Atualiza a página para refletir o novo saldo
        } else {
            const errorData = await response.json();
            alert(`Erro ao realizar a compra: ${errorData.mensagem}`);
        }
    } catch (error) {
        console.error("Erro ao realizar a compra:", error);
        alert("Erro ao realizar a compra. Tente novamente mais tarde.");
    }
});

// Carrega os dados do usuário ao carregar a página
document.addEventListener("DOMContentLoaded", async () => {
    const usuarios = JSON.parse(localStorage.getItem("usuarios") || "[]");
    const email = localStorage.getItem("userEmail");
    const user = usuarios.find((u) => u.email === email);

    if (user) {
        const boasEl = document.getElementById("boas-vindas") || document.querySelector(".logo h1");
        if (boasEl) {
            const primeiroNome = user.nome.split(" ")[0] || "Usuário";
            boasEl.textContent = `Olá, ${primeiroNome}`;
        }

        const saldoEl = document.getElementById("dinheiro");
        if (saldoEl) {
            saldoEl.textContent = `R$ ${Number(user.saldo).toFixed(2).replace(".", ",")}`;
        }
    } else {
        console.warn("Usuário não encontrado no localStorage.");
    }

    const voltarEl = document.getElementById("voltar") || document.getElementById("divvoltar");
    if (voltarEl) {
        voltarEl.style.cursor = "pointer";
        voltarEl.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = "pagamento.html";
        });
    }
});




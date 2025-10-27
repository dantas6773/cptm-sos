const form = document.getElementById("forme");
const emailEl = document.getElementById("email");
const cpfEl = document.getElementById("cpf");
const senhaEl = document.getElementById("senha");

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!emailEl || !cpfEl || !senhaEl) {
        console.error('Elemento não encontrado:', { emailEl, cpfEl, senhaEl });
        alert('Erro no formulário: elementos ausentes. Veja o console.');
        return;
    }

    const email = emailEl.value.trim();
    const cpf = cpfEl.value.trim();
    const senha = senhaEl.value.trim();

    if (email && cpf && senha) {
        try {
            const response = await fetch('http://localhost:5001/api/cadastro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, cpf, senha })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('userEmail', email);
                window.location.href = "../html/apelido.html";
            } else {
                alert(data.mensagem);
            }
        } catch (error) {
            console.error('Erro:', error);
            alert("Erro ao cadastrar. Tente novamente.");
        }
    } else {
        alert("Todos os campos (Email, CPF e Senha) devem estar preenchidos para avançar.");
    }
});
const form = document.getElementById("forme");
const email = document.getElementById("email");
const cpf = document.getElementById("cpf"); 
const senha = document.getElementById("senha");

form.addEventListener("submit", async function (event) {
    event.preventDefault(); 

    if (email.value && cpf.value && senha.value) {
        try {
            const response = await fetch('http://localhost:5001/api/cadastro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email.value,
                    cpf: cpf.value,
                    senha: senha.value
                })
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = "/assets/html/apelido.html";
            } else {
                alert(data.mensagem);
            }
        } catch (error) {
            alert("Erro ao cadastrar. Tente novamente.");
        }
    } else {
        alert("Todos os campos (Email, CPF e Senha) devem estar preenchidos para avançar.");
    }
});
const form = document.getElementById("forme");
const email = document.getElementById("email");
const cpf = document.getElementById("cpf"); 
const senha = document.getElementById("senha");

form.addEventListener("submit", function (event) {
    event.preventDefault(); 

    if (email.value && cpf.value && senha.value) {
        window.location.href = "/assets/html/apelido.html";
    } else {
        alert("Todos os campos (Email, CPF e Senha) devem estar preenchidos para avançar.");
    }
});
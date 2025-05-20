document.addEventListener("DOMContentLoaded", function () { //função para garantir que o js só seja executado qdo o html tiver 100% carregado
  const form = document.getElementById("forme");
  const email = document.getElementById("email");
  const senha = document.getElementById("senha");

  form.addEventListener("submit", function (event) {
    event.preventDefault(); // impede o envio automatico do formulario

    if (email.value && senha.value) {
      window.location.href = "home.html"; 
    } else {
      alert("Todos os campos devem estar preenchidos para avançar");
    }
  });
});

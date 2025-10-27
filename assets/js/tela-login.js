const form = document.getElementById("forme");
const email = document.getElementById("email");
const senha = document.getElementById("senha");

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  
  if (!email.value || !senha.value) {
    alert("Todos os campos devem estar preenchidos para avançar");
    return;
  }

  try {
    const response = await fetch('http://localhost:5001/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.value,
        senha: senha.value
      })
    });

    const data = await response.json();
    console.log('Resposta do servidor:', data); // Para debug

    if (response.status === 200) {
      localStorage.setItem('apelido', data.usuario.nome);
      localStorage.setItem('userEmail', data.usuario.email);
      window.location.href = "./assets/html/home.html";
    } else {
      alert(data.mensagem);
    }
  } catch (error) {
    console.error('Erro:', error);
    alert("Erro ao conectar com o servidor. Verifique se o servidor está rodando.");
  }
});
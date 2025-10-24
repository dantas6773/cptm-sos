const botao = document.getElementById('botao');
const nome = document.getElementById('name'); // Assumindo que 'name' é o ID do input de apelido

botao.addEventListener('click', async function(event) {
    event.preventDefault();

    const apelido = nome.value;
    const email = localStorage.getItem('userEmail');

    if (!apelido) {
        alert('Preencha seu nome (apelido) antes de avançar');
        return;
    }

    if (!email) {
        alert('Erro: Usuário não identificado. Por favor, faça login novamente.');
        console.error('Erro de lógica: "userEmail" não encontrado no localStorage.');
        return;
    }

    try {
        console.log('Enviando para o servidor:', { email, apelido });

        const response = await fetch('http://localhost:5001/api/usuario/apelido', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                apelido: apelido
            })
        });

        // --- MANIPULAÇÃO DE ERRO CORRIGIDA ---
        if (!response.ok) {
            // Se a resposta não for OK, leia como TEXTO, não como JSON.
            const errorText = await response.text();
            
            // Log do HTML/Texto de erro real recebido do servidor
            console.error('Resposta de erro do servidor (não-JSON):', errorText); 
            
            // Tenta ver se é um 404 do Express
            if (response.status === 404 && errorText.includes("Cannot PUT")) {
                throw new Error(`Erro 404: Rota não encontrada no servidor. Verifique a URL: ${response.url}`);
            }
            
            // Joga um erro genérico com o texto que recebemos
            throw new Error(`Servidor respondeu com ${response.status}: ${errorText}`);
        }
        // --- FIM DA CORREÇÃO ---

        // Se response.ok for true, esperamos JSON
        const data = await response.json(); 
        console.log('Resposta do servidor:', data.mensagem);

        localStorage.setItem('apelido', apelido);
        window.location.href = "/assets/html/home.html";
        
    } catch (error) {
        // Agora o 'error.message' conterá o texto HTML que recebemos
        console.error('Erro completo na requisição:', error);
        alert(`Erro ao atualizar apelido: ${error.message}`);
    }
});
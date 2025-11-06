voltar = document.getElementById('voltar');
organizador = document.getElementById('organizador');
faça_uma_denuncia = document.getElementById('faça-uma-denuncia');
setavolt = document.getElementById('setavoltar');

voltar.addEventListener('click', function () {
  window.location.href = '/assets/html/home.html';
});

organizador.addEventListener('click', async function (e) {
  e.preventDefault();

  const cpfLogado = localStorage.getItem('cpfLogado');

  try {
    if (cpfLogado) {
      await fetch('/api/alerta/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpfLogado })
      });
    } else {
      console.warn('cpfLogado não encontrado no localStorage');
    }
  } catch (err) {
    console.error('Falha ao iniciar alerta:', err);
  } finally {
    window.location.href = '/assets/html/denuncia.html';
  }
});

faça_uma_denuncia.addEventListener('click', function () {
  window.location.href = '/assets/html/formularioDenuncia.html';
});

setavolt.addEventListener('click', function () {
  window.location.href = '/assets/html/home.html';
});
voltar.addEventListener('click', function() {
    window.location.href = 'home.html'
})

organizador.addEventListener('click', function(){
    window.location.href = 'denuncia.html'
})

faça_uma_denuncia.addEventListener('click', function(){
    window.location.href = 'formularioDenuncia.html'
})
setavolt.addEventListener('click', function() {
    window.location.href = 'home.html'
})

//testado
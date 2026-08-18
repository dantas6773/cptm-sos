const slider = document.getElementById('slider');
const button = document.getElementById('slider-button');
const text = document.querySelector('.slider-text');
const botoes = document.getElementById('botoes');
const cpfContainer = document.getElementById('cpf-container');
const voltarBtn = document.getElementById('voltar');
const cadeado = document.getElementById('cadeado');
const inputCpf = document.getElementById('cpf-input');
const setaCircular = document.getElementById('cpf-button');
const videoCamera = document.getElementById('camera-video');
let streamCamera = null;

let isDragging = false;
let startX;
let currentX = 0;

const sliderPadding = 3;
let maxMove = 0;

// calcula o quanto o botão pode se mover
function calcularMaxMove() {
  if (!slider || !button) return;
  maxMove = slider.clientWidth - button.clientWidth - sliderPadding * 2;
}
window.addEventListener('load', calcularMaxMove);
window.addEventListener('resize', calcularMaxMove);

// ========================= SLIDER =========================
function startDrag(x) {
  if (!button) return;
  isDragging = true;
  startX = x - currentX;
}

function duringDrag(x) {
  if (!isDragging || !button) return;
  currentX = x - startX;
  if (currentX < 0) currentX = 0;
  if (currentX > maxMove) currentX = maxMove;

  button.style.transform = `translateX(${currentX}px)`;

  if (text && maxMove > 0) {
    const opacity = 0.7 - (currentX / maxMove);
    text.style.opacity = opacity;
  }
}

function endDrag() {
  if (!isDragging) return;
  isDragging = false;

  if (currentX >= maxMove) {
    ativarTelaCpf();
  } else {
    currentX = 0;
    if (button) button.style.transform = `translateX(0px)`;
    if (text) text.style.opacity = 0.7;
  }
}

if (button) {
  button.addEventListener('mousedown', e => startDrag(e.clientX));
  document.addEventListener('mousemove', e => duringDrag(e.clientX));
  document.addEventListener('mouseup', endDrag);

  button.addEventListener('touchstart', e => {
    if (e.touches.length > 0) startDrag(e.touches[0].clientX);
  });
  document.addEventListener('touchmove', e => {
    if (e.touches.length > 0) duringDrag(e.touches[0].clientX);
  }, { passive: true });
  document.addEventListener('touchend', endDrag);
}

// ========================= SIRENE =========================
const sirene = document.getElementById('sirene');
const iconeSirene = document.getElementById('icone-sirene');
const textoSirene = document.getElementById('texto-sirene');
const audioSirene = new Audio('assets/sons/sirene.wav');

let sireneAtiva = false;

if (sirene) {
  sirene.addEventListener('click', () => {
    sireneAtiva = !sireneAtiva;

    if (sireneAtiva) {
      sirene.style.backgroundColor = '#ED1C24';
      if (textoSirene) textoSirene.style.color = '#F4F4F4';
      if (iconeSirene) iconeSirene.src = 'assets/imagem/sireneBranca.png';
      audioSirene.play();
    } else {
      sirene.style.backgroundColor = '';
      if (textoSirene) textoSirene.style.color = '';
      if (iconeSirene) iconeSirene.src = 'assets/imagem/sirene.png';
      audioSirene.pause();
      audioSirene.currentTime = 0;
    }
  });
}

// ========================= ME ENCONTRE =========================
const meEncontre = document.getElementById('meEncontre');
const iconeMeEncontre = meEncontre ? meEncontre.querySelector('img#escudo') : null;
const textoMeEncontre = meEncontre ? meEncontre.querySelector('h4#texto-meEncontre') : null;

let encontreAtivo = false;

if (meEncontre) {
  meEncontre.addEventListener('click', () => {
    encontreAtivo = !encontreAtivo;

    if (encontreAtivo) {
      meEncontre.style.backgroundColor = '#ED1C24';
      if (textoMeEncontre) textoMeEncontre.style.color = '#F4F4F4';
      if (iconeMeEncontre) iconeMeEncontre.src = 'assets/imagem/escudoBranco.png';

      alert('🚓 As autoridades locais já estão indo até você.\nMantenha o botão ligado para continuar compartilhando a sua localização.');
    } else {
      meEncontre.style.backgroundColor = '';
      if (textoMeEncontre) textoMeEncontre.style.color = '';
      if (iconeMeEncontre) iconeMeEncontre.src = 'assets/imagem/escudo.png';
      alert('Você parou de compartilhar a sua localização.');
    }
  });
}

// ========================= LIGAR 190 =========================
const ligar190 = document.getElementById('ligar190');
const iconeLigar = ligar190 ? ligar190.querySelector('img') : null;
const textoLigar = ligar190 ? ligar190.querySelector('h4') : null;

if (ligar190) {
  ligar190.addEventListener('mousedown', () => {
    ligar190.style.backgroundColor = '#ED1C24';
    if (textoLigar) textoLigar.style.color = '#F4F4F4';
    if (iconeLigar) iconeLigar.src = 'assets/imagem/telefoneBranco.png';
  });

  ligar190.addEventListener('mouseup', () => {
    ligar190.style.backgroundColor = '';
    if (textoLigar) textoLigar.style.color = '';
    if (iconeLigar) iconeLigar.src = 'assets/imagem/telefone.png';
  });
}

// ========================= TELA DO CPF =========================
function ativarTelaCpf() {
  currentX = maxMove;
  if (button) {
    button.style.transform = `translateX(${maxMove}px)`;
    button.style.pointerEvents = 'none';
  }
  if (cadeado) cadeado.src = 'assets/imagem/setaCircular.png';
  if (botoes) botoes.classList.add('hidden');
  if (slider) slider.classList.add('hidden');
  if (cpfContainer) cpfContainer.classList.remove('hidden');
}

function voltarTelaInicial(e) {
  if (e) e.preventDefault();
  currentX = 0;
  if (button) {
    button.style.transform = 'translateX(0px)';
    button.style.pointerEvents = 'auto';
  }
  if (cadeado) cadeado.src = 'assets/imagem/cadeado.png';
  if (botoes) botoes.classList.remove('hidden');
  if (slider) slider.classList.remove('hidden');
  if (cpfContainer) cpfContainer.classList.add('hidden');
  if (text) text.style.opacity = 0.7;
  if (inputCpf) inputCpf.value = '';
}

if (voltarBtn) {
  voltarBtn.addEventListener('click', voltarTelaInicial);
}

// ========================= CONFIRMAR ALERTA PELO CPF =========================
async function confirmarAlertaCpf(e) {
  e.preventDefault();

  if (!inputCpf) return;

  const cpfDigitado = inputCpf.value.trim();
  const cpfLogado = localStorage.getItem("cpfLogado");

  if (!cpfDigitado || !cpfLogado || cpfDigitado !== cpfLogado) {
    console.log("CPF incorreto ou usuário não logado.");
    return;
  }

  try {
    const resp = await authFetch("/api/alerta/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: cpfDigitado }),
    });

    // Sem esta checagem o app sairia da tela dizendo que desativou o alarme
    // mesmo quando o servidor recusou — perigoso justamente num fluxo de emergência.
    if (!resp.ok) {
      console.error("Falha ao confirmar alerta:", resp.status);
      return;
    }

    pararCamera(); // para a câmera antes de sair
    window.location.href = "pré-denucia.html";
  } catch (err) {
    console.error("Erro ao confirmar alerta:", err);
  }
}

if (setaCircular) {
  setaCircular.addEventListener("click", confirmarAlertaCpf);
}

// ========================= CÂMERA =========================
async function iniciarCamera() {
  if (!videoCamera || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.log("getUserMedia não suportado neste navegador.");
    return;
  }

  try {
    streamCamera = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment', // câmera traseira no celular, se tiver
      },
      audio: false,
    });

    videoCamera.srcObject = streamCamera;
    console.log("📷 Câmera iniciada");
  } catch (err) {
    console.error("Erro ao acessar a câmera:", err);
    alert("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
  }
}

function pararCamera() {
  if (streamCamera) {
    streamCamera.getTracks().forEach(track => track.stop());
    streamCamera = null;
    console.log("📷 Câmera parada");
  }
}

window.addEventListener('load', () => {
  calcularMaxMove();
  iniciarCamera();
});
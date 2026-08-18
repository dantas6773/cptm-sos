// Helper compartilhado de autenticação.
// Inclua este script ANTES do script da tela em qualquer HTML que precise
// chamar uma rota protegida da API (saldo, apelido, alerta, etc.).

// Vazio de propósito: o próprio servidor que expõe a API serve as telas, então
// as chamadas são same-origin e o app funciona em qualquer host/porta sem editar
// nada. Só defina window.API_BASE_OVERRIDE se abrir o front por outro servidor.
const API_BASE = window.API_BASE_OVERRIDE || "";

function formatBRL(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function salvarSessao({ token, usuario }) {
  if (token) localStorage.setItem("authToken", token);
  if (usuario) {
    localStorage.setItem("userEmail", usuario.email);
    localStorage.setItem("idLogado", usuario.id);
    localStorage.setItem("cpfLogado", usuario.cpf || "");
    if (usuario.nome) localStorage.setItem("apelido", usuario.nome);
  }
}

function limparSessao() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("idLogado");
  localStorage.removeItem("cpfLogado");
  localStorage.removeItem("apelido");
}

// fetch autenticado: injeta o Bearer token automaticamente.
// Se não houver token, redireciona pro login em vez de deixar a chamada falhar sem explicação.
async function authFetch(path, options = {}) {
  const token = localStorage.getItem("authToken");

  if (!token) {
    window.location.href = "/login.html";
    throw new Error("Sem token de autenticação, redirecionando para login.");
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (resp.status === 401 || resp.status === 403) {
    limparSessao();
    window.location.href = "/login.html";
    throw new Error("Sessão expirada, redirecionando para login.");
  }

  return resp;
}

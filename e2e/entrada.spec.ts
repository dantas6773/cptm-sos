// Telas de entrada: login e cadastro. Cobre o que a pessoa faz antes de ter conta
// ou sessão — inclusive os dois recursos que existiam por falta: conferir a senha
// digitada e voltar do cadastro para o login.
import { test, expect } from "@playwright/test";
import { resetarBanco } from "./helpers.ts";

test.beforeEach(() => {
    resetarBanco();
});

test("o botão de revelar mostra e esconde a senha", async ({ page }) => {
    await page.goto("/login.html");

    const senha = page.locator("#senha");
    const botao = page.locator(".revelar-senha");

    await senha.fill("MinhaSenha123");
    await expect(senha).toHaveAttribute("type", "password");
    await expect(botao).toHaveAttribute("aria-label", "Mostrar senha");

    await botao.click();
    await expect(senha).toHaveAttribute("type", "text");
    await expect(botao).toHaveAttribute("aria-pressed", "true");
    await expect(botao).toHaveAttribute("aria-label", "Ocultar senha");
    // o valor não pode se perder na troca
    await expect(senha).toHaveValue("MinhaSenha123");

    await botao.click();
    await expect(senha).toHaveAttribute("type", "password");
    await expect(botao).toHaveAttribute("aria-pressed", "false");
});

test("revelar a senha devolve o foco ao campo", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill("#senha", "abc");
    await page.click(".revelar-senha");

    const focado = await page.evaluate(() => document.activeElement?.id);
    expect(focado).toBe("senha");
});

test("o cadastro tem como voltar para o login", async ({ page }) => {
    await page.goto("/cadastro.html");

    await page.click("#voltar-login");

    await page.waitForURL(/login\.html/);
    expect(page.url()).toContain("login.html");
});

test("o cadastro também permite conferir a senha digitada", async ({ page }) => {
    await page.goto("/cadastro.html");

    await page.fill("#senha", "SenhaNova123");
    await page.click(".revelar-senha");

    await expect(page.locator("#senha")).toHaveAttribute("type", "text");
});

test("login pelo formulário leva à home com sessão", async ({ page }) => {
    await page.goto("/login.html");

    await page.fill("#email", "ana.souza@example.com");
    await page.fill("#senha", "demo1234");
    await page.click("#botao");

    await page.waitForURL(/home\.html/);

    const sessao = await page.evaluate(() => ({
        token: !!localStorage.getItem("authToken"),
        email: localStorage.getItem("userEmail"),
        // o CPF não deve ser guardado no navegador
        cpf: localStorage.getItem("cpfLogado"),
    }));

    expect(sessao.token).toBe(true);
    expect(sessao.email).toBe("ana.souza@example.com");
    expect(sessao.cpf).toBeNull();
});

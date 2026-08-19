import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { autenticar, resetarBanco } from "./helpers.ts";

// "Central de Ajuda" existia no rodapé de três telas sem fazer nada, escrito de
// três formas diferentes — em pagamento.html era um <a> sem href, que o teclado
// nem alcança. Agora abre uma folha com o que o app realmente oferece.
const TELAS = ["/pagamento.html", "/pagamento-pós.html", "/formularioDenuncia.html"];

test.beforeEach(async ({ context, request }) => {
    resetarBanco();
    await autenticar(context, request, "ana.souza@example.com");
});

test("a ajuda abre nas três telas que a oferecem", async ({ page }) => {
    for (const tela of TELAS) {
        await page.goto(tela);
        await page.click("#Ajuda");
        await expect(page.locator(".dialogo-ajuda"), tela).toBeVisible();
        await expect(page.locator("#ajuda-titulo"), tela).toHaveText("Central de Ajuda");
    }
});

test("o gatilho é alcançável e acionável por teclado", async ({ page }) => {
    await page.goto("/pagamento.html");

    await page.locator("#Ajuda").focus();
    await expect(page.locator("#Ajuda")).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator(".dialogo-ajuda")).toBeVisible();

    // showModal() leva o foco para dentro da folha e Esc fecha, sem JavaScript nosso
    await expect(page.locator(".ajuda-fechar")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator(".dialogo-ajuda")).toBeHidden();
});

test("a ajuda entrega canais reais, não texto solto", async ({ page }) => {
    await page.goto("/pagamento.html");
    await page.click("#Ajuda");

    // 190 disca de verdade pelo telefone
    await expect(page.locator(".ajuda-acao.emergencia")).toHaveAttribute("href", "tel:190");

    // e a denúncia leva à tela que existe
    await page.click(".ajuda-acao.denuncia");
    await expect(page).toHaveURL(/formularioDenuncia\.html$/);
    await expect(page.locator("#pai-categorias")).toBeVisible();
});

test("a ajuda diz que o pagamento é simulado", async ({ page }) => {
    await page.goto("/pagamento.html");
    await page.click("#Ajuda");

    await expect(page.locator(".ajuda-nota")).toContainText("simuladas");
    await expect(page.locator(".ajuda-nota")).toContainText("nenhum valor real é cobrado");
});

test("a folha de ajuda aberta não tem violação de acessibilidade", async ({ page }) => {
    await page.goto("/pagamento.html");
    await page.click("#Ajuda");

    const resultado = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

    expect(resultado.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

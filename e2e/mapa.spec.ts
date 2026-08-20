import { test, expect } from "@playwright/test";
import { autenticar, resetarBanco } from "./helpers.ts";

// A tela pedia ao servidor que rodasse um script Python e abria o resultado em
// outra aba. O script quebrava com ModuleNotFoundError em qualquer máquina sem o
// ambiente virtual montado e, quando rodava, desenhava as estações em
// coordenadas que ele mesmo inventava. Agora o trajeto é calculado no servidor e
// mostrado na própria tela.
test.beforeEach(async ({ context, request }) => {
    resetarBanco();
    await autenticar(context, request, "ana.souza@example.com");
});

test("as 176 estações chegam aos dois seletores", async ({ page }) => {
    await page.goto("/mapa.html");

    // 176 estações mais a opção "Selecionar"
    await expect(page.locator("#origem option")).toHaveCount(177);
    await expect(page.locator("#destino option")).toHaveCount(177);
});

test("o trajeto aparece na própria tela, com linha, paradas e tempo", async ({ page }) => {
    await page.goto("/mapa.html");

    await page.selectOption("#origem", "Butantã");
    await page.selectOption("#destino", "Ana Rosa");
    await page.click("#gerar-mapa-btn");

    const pernas = page.locator(".trajeto-perna");
    await expect(pernas).toHaveCount(2);
    await expect(pernas.nth(0)).toContainText("Linha 4 - Amarela");
    await expect(pernas.nth(0)).toContainText("Paulista");
    await expect(pernas.nth(1)).toContainText("Linha 2 - Verde");
    await expect(pernas.nth(1)).toContainText("Consolação");

    await expect(page.locator(".trajeto-resumo")).toContainText("22 minutos");
    await expect(page.locator(".trajeto-resumo")).toContainText("1 baldeação");
});

// O tempo sai de uma taxa fixa por parada, não de tabela de horários. A tela diz
// isso: prometer precisão que os dados não têm seria o mesmo erro do mapa antigo.
test("a tela declara que o tempo é estimado", async ({ page }) => {
    await page.goto("/mapa.html");
    await page.selectOption("#origem", "Sé");
    await page.selectOption("#destino", "Luz");
    await page.click("#gerar-mapa-btn");

    await expect(page.locator(".trajeto-nota")).toContainText("Estimativa");
    await expect(page.locator(".trajeto-nota")).toContainText("não usa tabela de horários");
});

test("nada é pedido enquanto faltar uma das pontas", async ({ page }) => {
    await page.goto("/mapa.html");
    await expect(page.locator("#gerar-mapa-btn")).toBeDisabled();

    await page.selectOption("#origem", "Luz");
    await expect(page.locator("#gerar-mapa-btn")).toBeDisabled();

    await page.selectOption("#destino", "Brás");
    await expect(page.locator("#gerar-mapa-btn")).toBeEnabled();
});

test("origem igual ao destino avisa antes de deixar pedir", async ({ page }) => {
    await page.goto("/mapa.html");
    await page.selectOption("#origem", "Luz");
    await page.selectOption("#destino", "Luz");

    await expect(page.locator("#gerar-mapa-btn")).toBeDisabled();
    await expect(page.locator("#trajeto-info")).toContainText("duas estações diferentes");
});

// Os seletores eram <div role="button"> com uma lista de 176 <li>: o teclado
// alcançava o botão, mas Enter não abria nada.
test("dá para montar o trajeto inteiro pelo teclado", async ({ page }) => {
    await page.goto("/mapa.html");

    await page.locator("#origem").focus();
    await page.locator("#origem").selectOption("Jabaquara");
    await page.keyboard.press("Tab");
    await expect(page.locator("#destino")).toBeFocused();
    await page.locator("#destino").selectOption("Tucuruvi");

    await page.keyboard.press("Tab");
    await expect(page.locator("#gerar-mapa-btn")).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.locator(".trajeto-resumo")).toContainText("22 paradas");
});

test("nenhuma chamada abre outra aba nem chama o servidor de Python", async ({ page, context }) => {
    const abas: string[] = [];
    context.on("page", (nova) => abas.push(nova.url()));

    const chamadas: string[] = [];
    page.on("request", (r) => chamadas.push(new URL(r.url()).pathname));

    await page.goto("/mapa.html");
    await page.selectOption("#origem", "Luz");
    await page.selectOption("#destino", "Brás");
    await page.click("#gerar-mapa-btn");
    await expect(page.locator(".trajeto-resumo")).toBeVisible();

    expect(abas).toEqual([]);
    expect(chamadas.filter((c) => c.includes("gera-mapa"))).toEqual([]);
});

test("o mapa da tela é arrastável, inclusive por toque", async ({ page }) => {
    await page.goto("/mapa.html");
    await page.waitForTimeout(300);

    const antes = await page.locator(".map").evaluate((el) => (el as HTMLElement).style.left);

    const caixa = (await page.locator(".map-container").boundingBox())!;
    await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
    await page.mouse.down();
    await page.mouse.move(caixa.x + caixa.width / 2 - 80, caixa.y + caixa.height / 2, { steps: 10 });
    await page.mouse.up();

    const depois = await page.locator(".map").evaluate((el) => (el as HTMLElement).style.left);
    expect(depois).not.toBe(antes);

    // o gesto pertence ao mapa: sem isto o navegador rola a página em vez de mover
    const toque = await page.locator(".map-container").evaluate((el) => getComputedStyle(el).touchAction);
    expect(toque).toBe("none");
});

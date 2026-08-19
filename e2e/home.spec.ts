// Home: o carrossel de avisos e o indicador de página. Sem o indicador, o segundo
// card aparece cortado na borda e nada sinaliza que há mais conteúdo — dava para
// confundir com corte acidental de layout.
import { test, expect } from "@playwright/test";
import { autenticar, resetarBanco } from "./helpers.ts";

test.beforeEach(async ({ context, request }) => {
    resetarBanco();
    await autenticar(context, request, "ana.souza@example.com");
});

test("o carrossel de avisos tem um indicador por aviso", async ({ page }) => {
    await page.goto("/home.html");

    const cards = page.locator(".aviso-card");
    const pontos = page.locator(".avisos-indicadores button");

    await expect(pontos).toHaveCount(await cards.count());
    await expect(pontos.first()).toHaveAttribute("aria-selected", "true");
});

test("clicar num indicador leva ao aviso correspondente", async ({ page }) => {
    await page.goto("/home.html");

    await page.locator(".avisos-indicadores button").nth(2).click();

    await expect(page.locator('.avisos-indicadores button[aria-selected="true"]'))
        .toHaveAttribute("aria-label", /3 de/);
});

test("rolar o carrossel atualiza o indicador", async ({ page }) => {
    await page.goto("/home.html");

    await page.evaluate(() => {
        const lista = document.querySelector(".avisos-lista")!;
        lista.scrollTo({ left: lista.scrollWidth });
    });

    await expect(page.locator('.avisos-indicadores button[aria-selected="true"]'))
        .not.toHaveAttribute("aria-label", /1 de/);
});

test("a home carrega sem erro de script", async ({ page }) => {
    const erros: string[] = [];
    page.on("pageerror", (e) => erros.push(String(e)));

    await page.goto("/home.html");
    await page.waitForTimeout(600);

    expect(erros).toEqual([]);
});

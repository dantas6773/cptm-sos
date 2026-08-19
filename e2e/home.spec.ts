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

test("o botão de ocultar saldo alterna e anuncia o estado", async ({ page }) => {
    await page.goto("/home.html");

    const olho = page.locator("#olho");
    const valor = page.locator("#valor-saldo");

    await expect(valor).toHaveText(/R\$/);
    await expect(olho).toHaveAttribute("aria-label", "Ocultar saldo");

    await olho.click();
    await expect(valor).toHaveText("********");
    await expect(olho).toHaveAttribute("aria-pressed", "true");
    await expect(olho).toHaveAttribute("aria-label", "Mostrar saldo");

    await olho.click();
    await expect(valor).toHaveText(/R\$/);
    await expect(olho).toHaveAttribute("aria-pressed", "false");
});

test("a faixa diagonal não invade a foto de perfil", async ({ page }) => {
    await page.goto("/home.html");

    const medidas = await page.evaluate(() => {
        const faixa = document.querySelector(".barra")!.getBoundingClientRect();
        const perfil = document.querySelector(".perfil")!.getBoundingClientRect();
        return { faixaDireita: faixa.right, perfilEsquerda: perfil.left };
    });

    expect(medidas.faixaDireita).toBeLessThan(medidas.perfilEsquerda);
});

test("apelido comprido não empurra a foto de perfil para fora", async ({ page, request }) => {
    const resp = await request.post("/api/login", {
        data: { email: "ana.souza@example.com", senha: "demo1234" },
    });
    const { token } = await resp.json();

    await request.put("/api/usuario/apelido", {
        data: { apelido: "A".repeat(40) },
        headers: { Authorization: `Bearer ${token}` },
    });

    await page.setViewportSize({ width: 393, height: 800 });
    await page.goto("/home.html");
    await page.waitForTimeout(600);

    const medidas = await page.evaluate(() => {
        const perfil = document.querySelector(".perfil")!.getBoundingClientRect();
        return { perfilDireita: perfil.right, janela: window.innerWidth };
    });

    // a foto precisa continuar dentro da tela, e não empurrada para fora por um
    // apelido comprido na saudação
    expect(medidas.perfilDireita).toBeLessThanOrEqual(medidas.janela);
});

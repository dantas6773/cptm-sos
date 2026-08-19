import { test, expect } from "@playwright/test";
import { autenticar, resetarBanco } from "./helpers";

// As telas internas passaram a compartilhar um cabeçalho só (assets/css/cabecalho.css).
// Antes cada folha tinha a sua cópia e elas divergiram: a home ganhou os trilhos e a
// saudação, enquanto pagamento e denúncia ficaram com a faixa larga antiga e uma foto
// de perfil que já havia sido removida. Estes testes existem para que a próxima
// divergência apareça aqui, e não numa captura de tela meses depois.
const TELAS = ["/home.html", "/pagamento.html", "/pagamento-pós.html", "/formularioDenuncia.html"];

test.beforeEach(async ({ context, request }) => {
    resetarBanco();
    await autenticar(context, request, "ana.souza@example.com");
});

test("toda tela interna saúda a pessoa pelo nome", async ({ page }) => {
    for (const tela of TELAS) {
        await page.goto(tela);
        await expect(page.locator("#boas-vindas"), tela).toHaveText("Olá, Ana");
    }
});

test("nenhuma tela interna voltou a exibir foto de perfil", async ({ page }) => {
    for (const tela of TELAS) {
        await page.goto(tela);
        await expect(page.locator("header img[src*='perfil' i]"), tela).toHaveCount(0);
    }
});

test("os trilhos e a altura do cabeçalho são os mesmos em todas as telas", async ({ page }) => {
    const medidas: { tela: string; altura: number; trilhos: number }[] = [];

    for (const tela of TELAS) {
        await page.goto(tela);
        await page.waitForTimeout(200);
        medidas.push({
            tela,
            ...(await page.evaluate(() => ({
                altura: document.querySelector(".header-todo")!.getBoundingClientRect().height,
                trilhos: document.querySelectorAll(".header-todo .barra").length,
            }))),
        });
    }

    const referencia = medidas[0];
    for (const m of medidas) {
        expect(m.trilhos, m.tela).toBe(1);
        expect(Math.abs(m.altura - referencia.altura), m.tela).toBeLessThan(1);
    }
});

// O saldo e a saudação vinham da mesma rota, pedida duas vezes na mesma tela.
test("a tela pede /api/usuario uma vez só", async ({ page }) => {
    let chamadas = 0;
    page.on("request", (r) => {
        if (new URL(r.url()).pathname === "/api/usuario") chamadas++;
    });

    await page.goto("/pagamento.html");
    await expect(page.locator("#dinheiro")).not.toHaveText("Carregando...");
    await expect(page.locator("#boas-vindas")).toHaveText("Olá, Ana");

    expect(chamadas).toBe(1);
});

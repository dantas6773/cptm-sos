// Fluxo de dinheiro pela tela: comprar bilhete CREDITA a carteira (o pagamento
// acontece por fora) e passar o QR na catraca DEBITA uma passagem.
import { test, expect } from "@playwright/test";
import { autenticar, resetarBanco, lerBanco } from "./helpers.ts";

const EMAIL = "teste1@example.com"; // começa com saldo 0 no seed
const PRECO = 5.2;

function saldoDe(email: string) {
    return lerBanco().usuarios.find((u: any) => u.email === email).saldo;
}

test.beforeEach(async ({ context, request }) => {
    resetarBanco();
    await autenticar(context, request, EMAIL);
});

test("comprar bilhetes credita o saldo", async ({ page }) => {
    await page.goto("/pagamento-pós.html");
    page.on("dialog", (d) => d.accept());

    await page.click("#incrementar-bilhetes");
    await page.click("#incrementar-bilhetes");
    await page.click("#botao-comprar");

    await expect.poll(() => saldoDe(EMAIL), { timeout: 5000 }).toBeCloseTo(2 * PRECO, 2);
});

test("passar na catraca debita uma passagem", async ({ page, request }) => {
    // credita o equivalente a um bilhete pela API, para focar o teste na catraca
    const resp = await request.post("/api/login", { data: { email: EMAIL, senha: "demo1234" } });
    const { token } = await resp.json();
    await request.post("/api/usuario/compra", {
        data: { quantidade: 1 },
        headers: { Authorization: `Bearer ${token}` },
    });

    await page.goto("/QR.html");
    await expect(page.locator(".saldo")).toContainText("5,20");

    await page.click("#btn-catraca");

    await expect(page.locator("#aviso-catraca")).toContainText("Passagem liberada");
    await expect(page.locator(".saldo")).toContainText("0,00");
    expect(saldoDe(EMAIL)).toBe(0);
});

test("catraca recusa quando o saldo não cobre a passagem", async ({ page }) => {
    await page.goto("/QR.html");
    await expect(page.locator(".saldo")).toContainText("0,00");

    await page.click("#btn-catraca");

    await expect(page.locator("#aviso-catraca")).toContainText("Saldo insuficiente");
    // e o saldo não pode ficar negativo
    expect(saldoDe(EMAIL)).toBe(0);
});

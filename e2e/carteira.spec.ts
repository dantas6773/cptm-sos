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

// Pix, cartão e boleto levavam à mesma tela e a escolha se perdia: quem clicava
// em Boleto via exatamente o que quem clicou em Pix, sem nada confirmando o que
// tinha selecionado.
test("o método escolhido chega à tela de compra", async ({ page }) => {
    for (const [metodo, rotulo] of [
        ["pix", "Pix"],
        ["cartao", "Cartão de Crédito"],
        ["boleto", "Boleto Bancário"],
    ]) {
        await page.goto("/pagamento.html");
        await page.click(`[data-metodo="${metodo}"]`);

        await expect(page).toHaveURL(new RegExp(`metodo=${metodo}$`));
        await expect(page.locator("#metodo-nome")).toHaveText(rotulo);
    }
});

test("chegar à compra sem escolher método não mostra linha vazia", async ({ page }) => {
    await page.goto("/pagamento-pós.html");
    await expect(page.locator("#metodo-escolhido")).toBeHidden();

    // e um método inventado na URL não vira texto na tela
    await page.goto("/pagamento-pós.html?metodo=qualquer-coisa");
    await expect(page.locator("#metodo-escolhido")).toBeHidden();
});

// O contador subia sem limite e o servidor recusava em 21; COMPRAR ficava ativo
// com zero bilhetes e só então avisava.
test("os limites da compra aparecem nos botões, não em recusa do servidor", async ({ page }) => {
    await page.goto("/pagamento-pós.html");

    await expect(page.locator("#botao-comprar")).toBeDisabled();
    await expect(page.locator("#decrecimo-bilhetes")).toBeDisabled();

    await page.click("#incrementar-bilhetes");
    await expect(page.locator("#botao-comprar")).toBeEnabled();
    await expect(page.locator("#decrecimo-bilhetes")).toBeEnabled();

    // sobe até o teto vindo de /api/config
    const { maxBilhetes } = await (await page.request.get("/api/config")).json();
    for (let i = 1; i < maxBilhetes; i++) await page.click("#incrementar-bilhetes");

    await expect(page.locator("#quantidade-bilhetes")).toHaveText(String(maxBilhetes));
    await expect(page.locator("#incrementar-bilhetes")).toBeDisabled();
});

// O retorno da compra era um alert() do navegador: bloqueava a tela e sumia sem
// deixar rastro para leitor de tela.
test("a compra responde na própria tela, sem caixa do sistema", async ({ page }) => {
    let houveDialogo = false;
    page.on("dialog", async (d) => {
        houveDialogo = true;
        await d.dismiss();
    });

    await page.goto("/pagamento-pós.html?metodo=pix");
    await page.click("#incrementar-bilhetes");
    await page.click("#botao-comprar");

    await expect(page.locator("#aviso-compra")).toContainText("adicionados ao seu saldo");
    await expect(page.locator("#dinheiro")).toContainText("5,20");
    expect(houveDialogo).toBe(false);
});

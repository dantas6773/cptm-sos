// Trava de acessibilidade. Roda o axe-core em cada tela e falha se aparecer
// violação nova. Sem isto, uma marcação corrigida hoje volta a quebrar amanhã
// sem ninguém perceber — foi assim que o projeto acumulou lang="en" em página
// portuguesa, input sem rótulo e div clicável inalcançável por teclado.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { autenticar, resetarBanco } from "./helpers.ts";

const TELAS = [
    "login.html",
    "cadastro.html",
    "apelido.html",
    "carregamento.html",
    "home.html",
    "QR.html",
    "mapa.html",
    "pagamento.html",
    "pagamento-pós.html",
    "pré-denucia.html",
    "formularioDenuncia.html",
];

// O contraste do vermelho da CPTM (#ED1C24 com texto branco) dá 4.38:1, abaixo
// do mínimo de 4.5:1 — é decisão de marca pendente com o time, não descuido.
// Fica de fora da trava para não mascarar violações novas, e documentado aqui.
const PENDENTE = ["color-contrast"];

test.beforeEach(async ({ context, request }) => {
    resetarBanco();
    await autenticar(context, request, "ana.souza@example.com");
});

for (const tela of TELAS) {
    test(`${tela} sem violações de acessibilidade`, async ({ page }) => {
        await page.goto(`/${encodeURIComponent(tela)}`);
        await page.waitForTimeout(500);

        const { violations } = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .disableRules(PENDENTE)
            .analyze();

        const resumo = violations.map((v) => `${v.id} (${v.nodes.length}x): ${v.help}`);
        expect(resumo, `violações em ${tela}`).toEqual([]);
    });
}

test("nenhuma tela declara idioma diferente de português", async ({ page }) => {
    for (const tela of TELAS) {
        await page.goto(`/${encodeURIComponent(tela)}`);
        const lang = await page.getAttribute("html", "lang");
        expect(lang?.toLowerCase(), `${tela} declara lang="${lang}"`).toBe("pt-br");
    }
});

test("todo campo de formulário tem rótulo acessível", async ({ page }) => {
    const semRotulo: string[] = [];

    for (const tela of TELAS) {
        await page.goto(`/${encodeURIComponent(tela)}`);
        const achados = await page.$$eval("input, textarea, select", (campos) =>
            campos
                .filter((c) => {
                    const el = c as HTMLInputElement;
                    if (el.type === "hidden") return false;
                    const temLabel =
                        document.querySelector(`label[for="${el.id}"]`) ||
                        el.closest("label") ||
                        el.getAttribute("aria-label") ||
                        el.getAttribute("aria-labelledby");
                    return !temLabel;
                })
                .map((c) => (c as HTMLInputElement).id || (c as HTMLInputElement).name || c.tagName)
        );
        achados.forEach((a) => semRotulo.push(`${tela}: ${a}`));
    }

    expect(semRotulo).toEqual([]);
});

test("a barra de navegação cabe inteira em tela de 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/home.html");
    await page.waitForTimeout(400);

    const cortados = await page.$$eval(".botao-footer", (itens) =>
        itens
            .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 0.5)
            .map((e) => e.textContent?.trim() || "")
    );

    expect(cortados, "itens do rodapé cortados em 320px").toEqual([]);
});

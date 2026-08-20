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

// Sobrava um vão de 173px entre o cartão e a barra de baixo: o mapa e o bloco de
// conteúdo tinham flex: 1 e dividiam a sobra. Agora só o mapa cresce.
test("o cartão encosta na barra de baixo, sem vão", async ({ page }) => {
    for (const altura of [800, 660, 568]) {
        await page.setViewportSize({ width: 393, height: altura });
        await page.goto("/mapa.html");
        await page.waitForTimeout(200);

        const m = await page.evaluate(() => {
            // mede o cartão, não a caixa que o contém: o vão que se enxergava
            // ficava dentro do bloco, com o cartão no topo e o resto vazio
            const cartao = document.querySelector(".container-pesquisa")!.getBoundingClientRect();
            const barra = document.querySelector(".barra-navegacao")!.getBoundingClientRect();
            return {
                vao: Math.round(barra.top - cartao.bottom),
                alturaMapa: Math.round(document.querySelector(".map-container")!.getBoundingClientRect().height),
                paginaRola: document.documentElement.scrollHeight > window.innerHeight + 1,
            };
        });

        // só o respiro do bloco, não um vazio
        expect(m.vao, `em ${altura}px`).toBeLessThanOrEqual(32);
        // e a altura que sobra vai para o mapa
        expect(m.alturaMapa, `em ${altura}px`).toBeGreaterThan(200);
        expect(m.paginaRola, `em ${altura}px`).toBe(false);
    }
});

// Um trajeto longo não pode espremer o mapa até sumir nem empurrar o cartão para
// fora: o mapa para num mínimo e o conteúdo rola por dentro.
test("trajeto longo faz o conteúdo rolar, sem esmagar o mapa", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/mapa.html");

    await page.selectOption("#origem", "Jundiaí");
    await page.selectOption("#destino", "Jabaquara");
    await page.click("#gerar-mapa-btn");
    await expect(page.locator(".trajeto-resumo")).toBeVisible();

    const m = await page.evaluate(() => {
        const conteudo = document.querySelector(".conteudo-mapa") as HTMLElement;
        return {
            alturaMapa: Math.round(document.querySelector(".map-container")!.getBoundingClientRect().height),
            mioloRola: conteudo.scrollHeight > conteudo.clientHeight + 1,
            paginaRola: document.documentElement.scrollHeight > window.innerHeight + 1,
        };
    });

    expect(m.alturaMapa).toBeGreaterThanOrEqual(180);
    expect(m.mioloRola).toBe(true);
    expect(m.paginaRola).toBe(false);
});

// A borda de baixo cortava o mapa em seco, no meio de linhas e nomes de estação.
// A máscara faz o mapa se dissolver no fundo da página nos últimos pixels.
test("a base do mapa se dissolve, em vez de terminar numa régua", async ({ page }) => {
    await page.goto("/mapa.html");

    const mascara = await page
        .locator(".map-container")
        .evaluate((el) => getComputedStyle(el).maskImage || (getComputedStyle(el) as any).webkitMaskImage);

    expect(mascara).toContain("linear-gradient");
    expect(mascara).toMatch(/transparent|rgba\(0, 0, 0, 0\)/);

    // A área esmaecida continua respondendo ao gesto: a máscara é só visual.
    // O ponto de teste é a faixa lateral ao cartão — a base do mapa passa por trás
    // dele, então lá o toque pertence ao cartão, não ao mapa.
    const mapa = (await page.locator(".map-container").boundingBox())!;
    const cartao = (await page.locator(".container-pesquisa").boundingBox())!;
    const y = (cartao.y + mapa.y + mapa.height) / 2; // dentro do esfumaçado
    const x = cartao.x / 2; // à esquerda do cartão

    const antes = await page.locator(".map").evaluate((el) => (el as HTMLElement).style.left);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y, { steps: 8 });
    await page.mouse.up();
    expect(await page.locator(".map").evaluate((el) => (el as HTMLElement).style.left)).not.toBe(antes);
});

// O mapa passa por trás do cartão e some no esfumaçado, em vez de terminar acima
// dele. A margem negativa não move o cartão: devolve a altura ao mapa.
test("o mapa continua por trás do cartão, até a altura dos seletores", async ({ page }) => {
    await page.goto("/mapa.html");
    await page.waitForTimeout(200);

    const m = await page.evaluate(() => {
        const caixa = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        return {
            baseMapa: Math.round(caixa(".map-container").bottom),
            topoCartao: Math.round(caixa(".container-pesquisa").top),
            baseSeletor: Math.round(caixa("#origem").bottom),
            camadaCartao: getComputedStyle(document.querySelector(".conteudo-mapa")!).zIndex,
        };
    });

    // a borda do mapa desce além do topo do cartão
    expect(m.baseMapa).toBeGreaterThan(m.topoCartao);
    // e chega perto da base dos seletores
    expect(Math.abs(m.baseMapa - m.baseSeletor)).toBeLessThan(24);
    // com o cartão pintado por cima
    expect(Number(m.camadaCartao)).toBeGreaterThan(0);
});

// O bloco do cartão cobre o mapa de ponta a ponta. Sem deixar o toque passar, a
// faixa vazia ao lado do cartão vira uma área morta: o mapa aparece ali e não
// responde ao arrasto.
test("a faixa ao lado do cartão continua sendo do mapa", async ({ page }) => {
    await page.goto("/mapa.html");
    await page.waitForTimeout(200);

    const bloco = await page
        .locator(".conteudo-mapa")
        .evaluate((el) => getComputedStyle(el).pointerEvents);
    const cartao = await page
        .locator(".container-pesquisa")
        .evaluate((el) => getComputedStyle(el).pointerEvents);

    expect(bloco).toBe("none");
    expect(cartao).toBe("auto");

    // e o cartão segue funcionando por cima
    await page.selectOption("#origem", "Luz");
    await expect(page.locator("#origem")).toHaveValue("Luz");
});

// Depois de pesquisar, metade da tela ficava com o resultado e não havia como
// desfazer: o mapa continuava lá atrás, encolhido, sem caminho de volta.
test("dá para voltar ao mapa depois de pesquisar", async ({ page }) => {
    await page.goto("/mapa.html");
    await page.selectOption("#origem", "Alto da Boa Vista");
    await page.selectOption("#destino", "Água Branca");
    await page.click("#gerar-mapa-btn");
    await expect(page.locator(".trajeto-resumo")).toBeVisible();

    const mapaComRota = await page.locator(".map-container").evaluate((el) => el.getBoundingClientRect().height);

    await page.click(".trajeto-voltar");

    await expect(page.locator(".trajeto-pernas")).toHaveCount(0);
    const mapaDepois = await page.locator(".map-container").evaluate((el) => el.getBoundingClientRect().height);
    expect(mapaDepois).toBeGreaterThan(mapaComRota);

    // e o foco não se perde ao desfazer
    await expect(page.locator("#gerar-mapa-btn")).toBeFocused();
});

// O resultado escondia o topo do cartão de busca: eu rolava o bloco para o
// trajeto ficar à vista, e os rótulos ORIGEM e DESTINO saíam por cima do corte.
test("o cartão de busca continua inteiro depois da pesquisa", async ({ page }) => {
    for (const altura of [745, 700, 660]) {
        await page.setViewportSize({ width: 393, height: altura });
        await page.goto("/mapa.html");
        await page.selectOption("#origem", "Alto da Boa Vista");
        await page.selectOption("#destino", "Água Branca");
        await page.click("#gerar-mapa-btn");
        await expect(page.locator(".trajeto-resumo")).toBeVisible();

        const m = await page.evaluate(() => {
            const bloco = document.querySelector(".conteudo-mapa")!;
            const rotulo = document.querySelector(".dropdown-label")!.getBoundingClientRect();
            return { rolagem: bloco.scrollTop, cortado: rotulo.top < bloco.getBoundingClientRect().top };
        });

        expect(m.rolagem, `em ${altura}px`).toBe(0);
        expect(m.cortado, `em ${altura}px`).toBe(false);
    }
});

// Com dois cartões empilhados e o mapa já no mínimo, a sobreposição deixa de
// parecer intencional e vira o mapa espiando por trás deles.
test("a sobreposição some quando há trajeto e volta quando ele sai", async ({ page }) => {
    await page.goto("/mapa.html");
    const sobreposicao = () =>
        page.evaluate(() =>
            getComputedStyle(document.querySelector(".pagina")!).getPropertyValue("--sobreposicao-mapa").trim()
        );

    expect(await sobreposicao()).not.toBe("0px");

    await page.selectOption("#origem", "Luz");
    await page.selectOption("#destino", "Brás");
    await page.click("#gerar-mapa-btn");
    await expect(page.locator(".trajeto-resumo")).toBeVisible();
    expect(await sobreposicao()).toBe("0px");

    await page.click(".trajeto-voltar");
    expect(await sobreposicao()).not.toBe("0px");
});

// A regra que importa, e não a propriedade que a implementa: se o bloco precisa
// rolar, ele tem de receber o toque. No WebKit um container que rola com
// pointer-events: none simplesmente não rola, e o trajeto ficava preso no que
// coubesse na tela — o Chromium rola assim mesmo, então só o invariante pega.
test("todo bloco que precisa rolar recebe o toque", async ({ page }) => {
    for (const altura of [800, 745, 700, 660, 568]) {
        await page.setViewportSize({ width: 393, height: altura });
        await page.goto("/mapa.html");
        await page.selectOption("#origem", "AACD-Servidor");
        await page.selectOption("#destino", "Calmon Viana");
        await page.click("#gerar-mapa-btn");
        await expect(page.locator(".trajeto-resumo")).toBeVisible();

        const m = await page.evaluate(() => {
            const bloco = document.querySelector(".conteudo-mapa") as HTMLElement;
            return {
                precisaRolar: bloco.scrollHeight > bloco.clientHeight + 1,
                recebeToque: getComputedStyle(bloco).pointerEvents !== "none",
            };
        });

        if (m.precisaRolar) {
            expect(m.recebeToque, `em ${altura}px o bloco rola mas não recebe toque`).toBe(true);
        }
    }
});

test("o trajeto longo rola até o fim", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 700 });
    await page.goto("/mapa.html");
    await page.selectOption("#origem", "AACD-Servidor");
    await page.selectOption("#destino", "Calmon Viana");
    await page.click("#gerar-mapa-btn");
    await expect(page.locator(".trajeto-resumo")).toBeVisible();

    // a nota do rodapé do cartão só aparece rolando até o fim
    await page.locator(".trajeto-nota").scrollIntoViewIfNeeded();
    await expect(page.locator(".trajeto-nota")).toBeInViewport();
});

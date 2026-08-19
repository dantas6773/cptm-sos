// O diferencial do projeto. Cobre o que só existe na tela: arrastar o slider para
// revelar o CPF, e o compartilhamento de localização do botão "Me encontre".
import { test, expect } from "@playwright/test";
import { autenticar, resetarBanco, lerBanco, usuarioDoSeed } from "./helpers.ts";

const EMAIL = "camila.pereira@example.com";
// Estação da Luz
const POSICAO = { latitude: -23.5354, longitude: -46.6329 };

test.use({
    permissions: ["camera", "geolocation"],
    geolocation: POSICAO,
    launchOptions: {
        // sem câmera falsa a tela de denúncia nunca termina de carregar no headless
        args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
});

test.beforeEach(async ({ context, request }) => {
    resetarBanco();
    const { token } = await autenticar(context, request, EMAIL);
    // o alerta precisa estar ligado: é o que a tela de denúncia pressupõe
    await request.put("/api/alerta", {
        data: { alerta: true },
        headers: { Authorization: `Bearer ${token}` },
    });
});

async function arrastarSlider(page: any) {
    const botao = await page.locator("#slider-button").boundingBox();
    const trilha = await page.locator("#slider").boundingBox();
    await page.mouse.move(botao.x + botao.width / 2, botao.y + botao.height / 2);
    await page.mouse.down();
    await page.mouse.move(trilha.x + trilha.width, botao.y + botao.height / 2, { steps: 20 });
    await page.mouse.up();
}

test("arrastar o slider revela a confirmação por CPF", async ({ page }) => {
    await page.goto("/denuncia.html");
    await expect(page.locator("#cpf-container")).toHaveClass(/hidden/);

    await arrastarSlider(page);

    await expect(page.locator("#cpf-container")).not.toHaveClass(/hidden/);
});

test("CPF errado avisa e mantém o alerta ligado", async ({ page }) => {
    await page.goto("/denuncia.html");
    await arrastarSlider(page);

    const avisos: string[] = [];
    page.on("dialog", async (d) => {
        avisos.push(d.message());
        await d.accept();
    });

    await page.fill("#cpf-input", "00000000000");
    await page.click("#cpf-button");
    await page.waitForTimeout(1200);

    // não pode navegar, nem derrubar a sessão levando ao login
    expect(page.url()).toContain("denuncia.html");
    expect(avisos.join(" ")).toContain("CPF");
    expect(lerBanco().usuarios.find((u: any) => u.email === EMAIL).alerta).toBe(true);
});

test("CPF correto desativa o alarme e avança", async ({ page }) => {
    const cpf = usuarioDoSeed(EMAIL).cpf;

    await page.goto("/denuncia.html");
    await arrastarSlider(page);

    await page.fill("#cpf-input", cpf);
    await page.click("#cpf-button");

    await page.waitForURL(/denucia\.html/, { timeout: 5000 });
    expect(lerBanco().usuarios.find((u: any) => u.email === EMAIL).alerta).toBe(false);
});

test("'Me encontre' compartilha a localização de verdade", async ({ page }) => {
    page.on("dialog", (d) => d.accept());

    await page.goto("/denuncia.html");
    await page.click("#meEncontre");

    // espera o watchPosition disparar e o envio chegar ao servidor
    await expect
        .poll(() => lerBanco().usuarios.find((u: any) => u.email === EMAIL).localizacao, {
            timeout: 10_000,
        })
        .toBeTruthy();

    const gravada = lerBanco().usuarios.find((u: any) => u.email === EMAIL).localizacao;
    expect(gravada.lat).toBeCloseTo(POSICAO.latitude, 3);
    expect(gravada.lng).toBeCloseTo(POSICAO.longitude, 3);
});

// A tela de cadastro aplica máscara e ensina a escrever "123.456.789-01"; este
// campo comparava o texto literal e recusava exatamente esse formato, com o
// alarme tocando. Agora ele aplica a mesma máscara e envia só os dígitos.
test("o campo de CPF do alarme aceita o formato que o cadastro ensina", async ({ page }) => {
    await page.goto("/denuncia.html");
    await arrastarSlider(page);

    const campo = page.locator("#cpf-input");
    await campo.pressSequentially(usuarioDoSeed(EMAIL).cpf);

    // a máscara guia o formato, como no cadastro
    await expect(campo).toHaveValue(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
    // e o teclado numérico é o que abre no celular
    await expect(campo).toHaveAttribute("inputmode", "numeric");

    // o formato pontuado desativa o alarme: era exatamente o que era recusado
    await page.click("#cpf-button");
    await page.waitForURL(/denucia\.html/, { timeout: 5000 });
    expect(lerBanco().usuarios.find((u: any) => u.email === EMAIL).alerta).toBe(false);
});

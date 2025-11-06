import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";

const server = express();

server.use(cors());
server.use(express.json());

// rota para retornar a lista de estações (nomes únicos a partir de estacoes.json)
server.get("/api/estacoes", (req: Request, res: Response) => {
	try {
		const filePath = path.join(__dirname, "estacoes.json");
		const raw = fs.readFileSync(filePath, "utf8");
		const linhas = JSON.parse(raw) as Array<any>;

		const nomes: string[] = [];
		linhas.forEach((linha) => {
			if (Array.isArray(linha.trajeto)) {
				linha.trajeto.forEach((estacao: string) => nomes.push(estacao));
			}
		});

		// torna únicos e ordena alfabeticamente
		const unique = Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b, "pt-BR"));

		return res.json(unique);
	} catch (err) {
		console.error("Erro ao ler estacoes.json", err);
		return res.status(500).json({ error: "Erro ao ler estações" });
	}
});

// rota simples que recebe origem/destino (usada pelo frontend)
server.post("/gera-mapa", (req: Request, res: Response) => {
	const { origin, destination } = req.body || {};
	if (!origin || !destination) {
		return res.status(400).json({ ok: false, error: "origin e destination são obrigatórios" });
	}

	// aqui você pode fazer processamento adicional (ex.: calcular rota)
	console.log("Gera mapa solicitado:", origin, "->", destination);

	return res.json({ ok: true, origin, destination });
});

// servir arquivos estáticos da pasta `assets` para facilitar testes locais
const assetsDir = path.join(__dirname, "..");
server.use(express.static(assetsDir));

// rota raiz útil para abrir direto o mapa
server.get("/", (req: Request, res: Response) => {
	res.redirect('/html/mapa.html');
});

server.listen(5001, () => {
	console.log("Servidor rodando na porta 5001");
	console.log(`Acesse: http://localhost:5001/html/mapa.html`);
});
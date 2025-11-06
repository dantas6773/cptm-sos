import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";

const server = express();

server.use(cors());
server.use(express.json());
server.use(express.json())
server.use(cors())

function readDB() {
    const dbPath = path.join(__dirname, 'usuario.json')
    // Adicionado log para verificar se o caminho do DB está correto
    // console.log(`[DB] Lendo banco de dados em: ${dbPath}`); 
    const data = fs.readFileSync(dbPath, 'utf-8')
    return JSON.parse(data)
}

function writeDB(data: any) {
    const dbPath = path.join(__dirname, 'usuario.json')
    // console.log(`[DB] Escrevendo no banco de dados em: ${dbPath}`);
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
}

server.post("/api/cadastro", (req: Request, res: Response) => {
    try {
        const { email, cpf, senha } = req.body

        if (!email || !cpf || !senha) {
            return res.status(400).json({
                mensagem: "Todos os campos são obrigatórios"
            })
        }

        const db = readDB()

        const userExists = db.usuarios.some((user: any) => 
            user.email === email || user.cpf === cpf
        )

        if (userExists) {
            return res.status(400).json({
                mensagem: "Usuário já cadastrado"
            })
        }

        const newUser = {
            id: db.usuarios.length + 1,
            nome: "Temporário",
            cpf,
            email,
            senha,
            saldo: 0,
            alerta: false
        }

        db.usuarios.push(newUser)
        writeDB(db)

        res.status(201).json({
            mensagem: "Cadastro realizado com sucesso",
            usuario: newUser
        })

    } catch (error) {
        console.error('[POST /api/cadastro] Erro:', error); // Log de erro
        res.status(500).json({
            mensagem: "Erro interno do servidor"
        })
    }
})

// --- MODIFICAÇÕES (LOGS) NESTE ENDPOINT ---
server.put("/api/usuario/apelido", (req: Request, res: Response) => {
    try {
        // 1. Log do que o servidor recebeu
        console.log(`[PUT /api/usuario/apelido] Requisição recebida:`, req.body);

        const { email, apelido } = req.body

        if (!email || !apelido) {
            // 2. Log de erro de validação (400)
            console.warn(`[PUT /api/usuario/apelido] Erro 400: Campos faltando. Email: ${email}, Apelido: ${apelido}`);
            return res.status(400).json({
                mensagem: "Email e apelido são obrigatórios"
            })
        }

        const db = readDB()
        
        // 3. Log da busca no DB
        console.log(`[PUT /api/usuario/apelido] Procurando por email: ${email}`);
        const userIndex = db.usuarios.findIndex((user: any) => user.email === email)

        if (userIndex === -1) {
            // 4. Log de usuário não encontrado (404)
            console.warn(`[PUT /api/usuario/apelido] Erro 404: Email ${email} não encontrado no banco de dados.`);
            return res.status(404).json({
                mensagem: "Usuário não encontrado"
            })
        }

        // 5. Log de sucesso
        console.log(`[PUT /api/usuario/apelido] Usuário encontrado (Índice: ${userIndex}). Atualizando nome para: ${apelido}`);
        db.usuarios[userIndex].nome = apelido
        writeDB(db)

        return res.status(200).json({
            mensagem: "Apelido atualizado com sucesso"
        })

    } catch (error) {
        // 6. Log de erro interno (500)
        console.error('[PUT /api/usuario/apelido] Erro 500 (Catch):', error)
        return res.status(500).json({
            mensagem: "Erro interno do servidor"
        })
    }
})

//Rota put para adicioanr saldo
server.put("/api/usuario/saldo", (req: Request, res: Response) => {
    try {
        const { id, amount } = req.body
        if (typeof id === "undefined" || typeof amount === "undefined") {
            return res.status(400).json({ mensagem: "id e amount são obrigatórios" })
        }
        const db = readDB()
        const userIndex = db.usuarios.findIndex((u: any) => Number(u.id) === Number(id))
        if (userIndex === -1) {
            return res.status(404).json({ mensagem: "Usuário não encontrado" })
        }
        const atual = Number(db.usuarios[userIndex].saldo || 0)
        db.usuarios[userIndex].saldo = Number((atual + Number(amount)).toFixed(2))
        writeDB(db)
        return res.status(200).json({ mensagem: "Saldo atualizado com sucesso", usuario: db.usuarios[userIndex] })
    } catch (error) {
        console.error('[PUT /api/usuario/saldo] Erro:', error)
        return res.status(500).json({ mensagem: "Erro interno do servidor" })
    }
})

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

// --- FIM DAS MODIFICAÇÕES ---

server.listen(5001, () => {
    console.log('Servidor rodando na porta 5001')
})


// ROTA LOGIN | INICIO

server.post("/api/login", (req: Request, res: Response) => {
    try {
        console.log(`[POST /api/login] Requisição recebida:`, req.body);

        const { email, senha } = req.body;
        if (!email || !senha) {
            console.warn(`[POST /api/login] Erro 400: Campos faltando. Email: ${email}`);
            return res.status(400).json({ mensagem: "Email e senha são obrigatórios" });
        }

        const db = readDB();
        const user = db.usuarios.find((u: any) => u.email === email);

        if (!user) {
            console.warn(`[POST /api/login] Erro 404: Email ${email} não encontrado.`);
            return res.status(404).json({ mensagem: "Usuário não encontrado" });
        }

        if (user.senha !== senha) {
            console.warn(`[POST /api/login] Erro 401: Senha incorreta para ${email}.`);
            return res.status(401).json({ mensagem: "Credenciais inválidas" });
        }

        // Remover a senha do objeto retornado
        const { senha: _, ...userSafe } = user;
        console.log(`[POST /api/login] Login bem-sucedido: ${email}`);

        return res.status(200).json({
            mensagem: "Login efetuado com sucesso",
            usuario: userSafe
        });
    } catch (error) {
        console.error('[POST /api/login] Erro:', error);
        return res.status(500).json({ mensagem: "Erro interno do servidor" });
    }
})

// ROTA LOGIN | FIM
// ROTA DENUNCIA | INICIO 

server.post('/api/alerta/iniciar', (req, res) => {
    const { cpf } = req.body || {};
    if (!cpf) return res.status(400).json({ message: 'CPF é obrigatório.' });
  
    const db = readDB();
    const user = db.usuarios.find((u: any) => u.cpf === cpf);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
  
    user.alerta = true;
    writeDB(db);
    res.json({ ok: true });
  });
  
  // POST /api/alerta/confirmar  { cpf: string }
  server.post('/api/alerta/confirmar', (req, res) => {
    const { cpf } = req.body || {};
    if (!cpf) return res.status(400).json({ message: 'CPF é obrigatório.' });
  
    const db = readDB();
    const user = db.usuarios.find((u: any) => u.cpf === cpf);
    if (!user) return res.status(404).json({ message: 'CPF incorreto.' });
  
    if (!user.alerta) {
      return res.status(409).json({ message: 'Nenhuma denúncia pendente para este usuário.' });
    }
  
    user.alerta = false;
    writeDB(db);
    res.json({ ok: true });
  });

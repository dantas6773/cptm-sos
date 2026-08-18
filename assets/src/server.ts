import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = "2h";
const RECARGA_MAXIMA = 500;
const PRECO_BILHETE = 5.20;
const MAX_BILHETES = 20;
// Sem fallback embutido: um valor fixo no código-fonte de um repositório público
// não é segredo nenhum — qualquer um forjaria um token válido para qualquer usuário.
function lerJwtSecret(): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        console.error("[server] JWT_SECRET não definido. Copie .env.example para .env e defina um valor aleatório longo.");
        console.error("[server] Ex.: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
        process.exit(1);
    }

    return secret;
}

const JWT_SECRET = lerJwtSecret();

// Sem isso, /api/login aceita tentativas ilimitadas — força bruta trivial.
const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensagem: "Muitas tentativas de login. Tente novamente em alguns minutos." },
});

const limiteCadastro = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensagem: "Muitas contas criadas a partir deste endereço. Tente mais tarde." },
});

// Teto por operação sozinho não impede saldo infinito: bastava repetir a chamada.
const limiteSaldo = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensagem: "Muitas operações de saldo seguidas. Aguarde um instante." },
});

// /gera-mapa sobe um processo Python por chamada — sem limite, é flood de CPU fácil.
const limiteMapa = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: "Muitas gerações de mapa seguidas. Aguarde um instante." },
});

interface AuthPayload {
    id: number;
    email: string;
}

interface AuthRequest extends Request {
    user?: AuthPayload;
}

function gerarToken(usuario: AuthPayload) {
    return jwt.sign(usuario, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, algorithm: "HS256" });
}

// Middleware: exige um Bearer token válido e expõe o usuário autenticado em req.user.
// Nenhuma rota protegida deve mais confiar em email/id/cpf vindos do corpo da requisição.
function autenticar(req: AuthRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ mensagem: "Token de autenticação ausente" });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as AuthPayload;
        next();
    } catch {
        return res.status(403).json({ mensagem: "Token inválido ou expirado" });
    }
}

const server = express();

// O app agora é servido por este mesmo servidor (same-origin), então CORS só
// precisa cobrir o desenvolvimento — e não qualquer origem da internet.
const ORIGENS_PERMITIDAS = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5001", "http://127.0.0.1:5001", "http://localhost:5500", "http://127.0.0.1:5500"];

server.use(cors({
    origin: (origin, callback) => {
        // sem Origin = mesma origem, curl, app nativo: liberado
        // Origem não permitida devolve `false`, não Error: lançar aqui viraria um 500
        // com stack trace (e o caminho absoluto do projeto) no corpo da resposta.
        // Sem os headers de CORS, o próprio navegador já bloqueia a leitura.
        callback(null, !origin || ORIGENS_PERMITIDAS.includes(origin));
    },
}));
server.use(express.json({ limit: "100kb" }));

// usuario.json fica fora de `assets/` de propósito: essa pasta é servida
// como estática (express.static abaixo), então qualquer arquivo dentro dela
// é baixável por qualquer um. O "banco" não pode estar num diretório público.
const DB_PATH = path.join(__dirname, "..", "..", "data", "usuario.json");
// usuario.json é o banco local (gitignorado) — nasce a partir do seed versionado
// na primeira execução, pra ninguém acabar commitando dado de cadastro real.
const DB_SEED_PATH = path.join(__dirname, "..", "..", "data", "usuario.seed.json");

if (!fs.existsSync(DB_PATH)) {
    try {
        fs.copyFileSync(DB_SEED_PATH, DB_PATH);
        console.log(`[server] Banco local criado a partir de ${path.basename(DB_SEED_PATH)}`);
    } catch (err) {
        console.error(`[server] Não foi possível criar ${DB_PATH} a partir do seed.`);
        console.error("[server] Confira se data/usuario.seed.json existe e se data/ permite escrita.");
        process.exit(1);
    }
}

function readDB() {
    const data = fs.readFileSync(DB_PATH, 'utf-8')
    return JSON.parse(data)
}

function writeDB(data: any) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

server.post("/api/cadastro", limiteCadastro, (req: Request, res: Response) => {
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

        const senhaHash = bcrypt.hashSync(senha, SALT_ROUNDS)

        // maior id + 1, e não length + 1: com um usuário removido, length repetiria um id existente
        const proximoId = db.usuarios.reduce((maior: number, u: any) => Math.max(maior, Number(u.id) || 0), 0) + 1

        const newUser = {
            id: proximoId,
            nome: "Temporário",
            cpf,
            email,
            senha: senhaHash,
            saldo: 0,
            alerta: false
        }

        db.usuarios.push(newUser)
        writeDB(db)

        const { senha: _novaSenha, ...usuarioSafe } = newUser
        const token = gerarToken({ id: newUser.id, email: newUser.email })

        res.status(201).json({
            mensagem: "Cadastro realizado com sucesso",
            usuario: usuarioSafe,
            token
        })

    } catch (error) {
        console.error('[POST /api/cadastro] Erro:', error); // Log de erro
        res.status(500).json({
            mensagem: "Erro interno do servidor"
        })
    }
})

server.put("/api/usuario/apelido", autenticar, (req: AuthRequest, res: Response) => {
    try {
        const email = req.user!.email
        const { apelido } = req.body

        if (!apelido) {
            return res.status(400).json({
                mensagem: "Apelido é obrigatório"
            })
        }

        const db = readDB()
        const userIndex = db.usuarios.findIndex((user: any) => user.email === email)

        if (userIndex === -1) {
            return res.status(404).json({
                mensagem: "Usuário não encontrado"
            })
        }

        db.usuarios[userIndex].nome = apelido
        writeDB(db)

        return res.status(200).json({
            mensagem: "Apelido atualizado com sucesso"
        })

    } catch (error) {
        console.error('[PUT /api/usuario/apelido] Erro:', error)
        return res.status(500).json({
            mensagem: "Erro interno do servidor"
        })
    }
})

//Rota put para adicioanr saldo
server.put("/api/usuario/saldo", autenticar, limiteSaldo, (req: AuthRequest, res: Response) => {
    try {
        const email = req.user!.email
        const { amount } = req.body;

        if (typeof amount === "undefined") {
            return res.status(400).json({ mensagem: "amount é obrigatório" });
        }

        // Recarga é simulada (não há gateway de pagamento), mas ainda assim o valor
        // não pode vir livre do cliente: sem teto, qualquer um se daria saldo infinito.
        if (typeof amount !== "number") {
            return res.status(400).json({ mensagem: "amount deve ser um número" });
        }

        const valor = amount;

        if (!Number.isFinite(valor) || valor <= 0) {
            return res.status(400).json({ mensagem: "amount deve ser um número positivo" });
        }

        if (valor > RECARGA_MAXIMA) {
            return res.status(400).json({ mensagem: `Recarga máxima por operação é R$ ${RECARGA_MAXIMA}` });
        }

        const db = readDB();
        const userIndex = db.usuarios.findIndex((u: any) => u.email === email);

        if (userIndex === -1) {
            return res.status(404).json({ mensagem: "Usuário não encontrado" });
        }

        const atual = Number(db.usuarios[userIndex].saldo || 0);
        db.usuarios[userIndex].saldo = Number((atual + valor).toFixed(2));
        writeDB(db);

        const { senha: _senha, ...usuarioSafe } = db.usuarios[userIndex];
        return res.status(200).json({ mensagem: "Saldo atualizado com sucesso", usuario: usuarioSafe });
    } catch (error) {
        console.error('[PUT /api/usuario/saldo] Erro:', error);
        return res.status(500).json({ mensagem: "Erro interno do servidor" });
    }
})

// Comprar bilhete CREDITA a carteira: o usuário paga por fora (Pix/cartão/boleto) e o
// valor vira saldo no app. O desconto acontece depois, na catraca, ao passar o QR code.
// O preço fica aqui, e não no cliente: senão bastaria mandar o valor que quisesse.
server.post("/api/usuario/compra", autenticar, limiteSaldo, (req: AuthRequest, res: Response) => {
    try {
        const email = req.user!.email;
        const { quantidade } = req.body;

        if (!Number.isInteger(quantidade) || quantidade <= 0 || quantidade > MAX_BILHETES) {
            return res.status(400).json({
                mensagem: `quantidade deve ser um inteiro entre 1 e ${MAX_BILHETES}`
            });
        }

        const db = readDB();
        const userIndex = db.usuarios.findIndex((u: any) => u.email === email);

        if (userIndex === -1) {
            return res.status(404).json({ mensagem: "Usuário não encontrado" });
        }

        const total = Number((quantidade * PRECO_BILHETE).toFixed(2));
        const atual = Number(db.usuarios[userIndex].saldo || 0);

        db.usuarios[userIndex].saldo = Number((atual + total).toFixed(2));
        writeDB(db);

        const { senha: _senha, ...usuarioSafe } = db.usuarios[userIndex];
        return res.status(200).json({
            mensagem: "Compra realizada com sucesso",
            quantidade,
            total,
            usuario: usuarioSafe
        });
    } catch (error) {
        console.error('[POST /api/usuario/compra] Erro:', error);
        return res.status(500).json({ mensagem: "Erro interno do servidor" });
    }
});

/**
 * GET /api/estacoes
 * Retorna lista de todas as estações únicas do sistema.
 * 
 * Extrai nomes das estações do arquivo estacoes.json,
 * remove duplicatas e retorna array ordenado alfabeticamente.
 */
server.get("/api/estacoes", (req: Request, res: Response) => {
    try {
        // carrega e parseia estacoes.json
        const filePath = path.join(__dirname, "estacoes.json");
        const raw = fs.readFileSync(filePath, "utf8");
        const linhas = JSON.parse(raw) as Array<any>;

        // extrai nomes de estações de todas as linhas
        const nomes: string[] = [];
        linhas.forEach((linha) => {
            if (Array.isArray(linha.trajeto)) {
                linha.trajeto.forEach((estacao: string) => nomes.push(estacao));
            }
        });

        // remove duplicatas e ordena alfabeticamente (pt-BR)
        const unique = Array.from(new Set(nomes))
            .sort((a, b) => a.localeCompare(b, "pt-BR"));

        return res.json(unique);
    } catch (err) {
        console.error("Erro ao ler estacoes.json:", err);
        return res.status(500).json({ 
            error: "Erro ao ler estações",
            details: err instanceof Error ? err.message : String(err)
        });
    }
});

/**
 * POST /gera-mapa
 * Gera visualização do mapa com rota entre duas estações
 *
 * Corpo da requisição:
 * {
 *   origin: string,      // Nome da estação de origem
 *   destination: string  // Nome da estação de destino
 * }
 *
 * Processo:
 * 1. Recebe origem/destino do frontend
 * 2. Executa script Python para gerar mapa (mapa_estacoes.py)
 * 3. Salva HTML do mapa gerado
 * 4. Retorna URL do mapa via Live Server
 *
 * Resposta:
 * {
 *   ok: true,
 *   url: string // URL do mapa gerado (ex: http://127.0.0.1:5500/assets/src/mapa_rota.html)
 * }
 *
 * Usado por: Página de seleção de estações (mapa)
 */
server.post("/gera-mapa", limiteMapa, async (req: Request, res: Response) => {
    // valida parâmetros
    const { origin, destination } = req.body || {};
    if (!origin || !destination) {
        return res.status(400).json({ 
            ok: false, 
            error: "origin e destination são obrigatórios" 
        });
    }

    console.log("Gera mapa solicitado:", origin, "->", destination);

    try {
        // prepara execução do script Python
        const { spawn } = await import('child_process');
        const scriptPath = path.join(__dirname, 'mapa_estacoes.py');
        const args = [
            '--start', origin,
            '--end', destination
        ];

        // executa Python com coleta de saída
        // python3: em macOS e na maioria das distros Linux não existe binário `python`
        const pythonBin = process.env.PYTHON_BIN || 'python3';
        const py = spawn(pythonBin, [scriptPath, ...args], {
            cwd: __dirname
        });

        py.on('error', (err) => {
            console.error(`[gera-mapa] Falha ao executar "${pythonBin}":`, err.message);
            if (!res.headersSent) {
                return res.status(500).json({
                    ok: false,
                    error: `Não foi possível executar "${pythonBin}". Instale o Python e as dependências de assets/src/requirements.txt.`
                });
            }
        });

        let stdout = '';
        let stderr = '';

        // captura saída em tempo real
        py.stdout.on('data', (data) => {
            const text = data.toString();
            stdout += text;
            console.log('[Python stdout]', text.trim());
        });
        py.stderr.on('data', (data) => {
            const text = data.toString();
            stderr += text;
            console.error('[Python stderr]', text.trim());
        });

        // aguarda término e retorna resultado
        py.on('close', (code) => {
            console.log(`Python process exited with code ${code}`);
            
            if (code === 0) {
                // sucesso: mapa em assets/src/mapa_rota.html
                const url = `/src/mapa_rota.html`;
                return res.json({ 
                    ok: true, 
                    origin, 
                    destination, 
                    url,
                    output: stdout 
                });
            } else {
                // erro: retorna detalhes para debug
                console.error('[gera-mapa] Python falhou:', { code, stderr: stderr.slice(0, 500) });
                return res.status(500).json({
                    ok: false,
                    error: 'Erro ao gerar mapa'
                });
            }
        });
    } catch (err) {
        // erro ao executar Python
        console.error('Erro ao executar script python:', err);
        return res.status(500).json({ 
            ok: false, 
            error: 'Erro interno ao executar script',
            details: err instanceof Error ? err.message : String(err)
        });
    }
});

// As telas .html ficam na raiz do projeto, junto de data/, .env, node_modules e .git.
// Servir a raiz inteira e tentar bloquear o que é sensível não funciona: um blocklist
// por prefixo é furado por "//data/x", "/data%2Fx" e "/./data/x", que só são
// normalizados depois, dentro do express.static. Por isso a regra aqui é allowlist —
// serve-se apenas assets/ e as páginas .html, e nada mais fica alcançável.
const ROOT_DIR = path.join(__dirname, "..", "..");

// Só as subpastas de fato públicas. `assets/src/` fica de fora de propósito: guarda
// o código do backend e o script Python, que não têm por que ser baixáveis.
for (const pasta of ["css", "js", "imagem", "sons"]) {
	server.use(`/assets/${pasta}`, express.static(path.join(ROOT_DIR, "assets", pasta), { dotfiles: "deny" }));
}

// exceção: o mapa gerado pelo script Python precisa ser aberto pelo navegador
server.get("/assets/src/mapa_rota.html", (_req: Request, res: Response) => {
	return res.sendFile(path.join(ROOT_DIR, "assets", "src", "mapa_rota.html"));
});

const PAGINAS = new Set(
	fs.readdirSync(ROOT_DIR).filter((arquivo) => arquivo.endsWith(".html"))
);

server.get("/:pagina", (req: Request, res: Response, next: NextFunction) => {
	// basename() descarta qualquer tentativa de traversal antes da checagem
	const pagina = path.basename(String(req.params.pagina));

	if (!PAGINAS.has(pagina)) {
		return next();
	}

	return res.sendFile(path.join(ROOT_DIR, pagina));
});

server.get("/", (req: Request, res: Response) => {
	res.redirect('/login.html');
});



// ROTA LOGIN | INICIO

server.post("/api/login", limiteLogin, (req: Request, res: Response) => {
    try {
        // Nunca logar req.body aqui: ele carrega a senha em texto puro.
        console.log(`[POST /api/login] Tentativa de login: ${req.body?.email}`);

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

        if (!bcrypt.compareSync(senha, user.senha)) {
            console.warn(`[POST /api/login] Erro 401: Senha incorreta para ${email}.`);
            return res.status(401).json({ mensagem: "Credenciais inválidas" });
        }

        // Remover a senha do objeto retornado
        const { senha: _, ...userSafe } = user;
        const token = gerarToken({ id: user.id, email: user.email });
        console.log(`[POST /api/login] Login bem-sucedido: ${email}`);

        return res.status(200).json({
            mensagem: "Login efetuado com sucesso",
            usuario: userSafe,
            token
        });
    } catch (error) {
        console.error('[POST /api/login] Erro:', error);
        return res.status(500).json({ mensagem: "Erro interno do servidor" });
    }
})

// ROTA LOGIN | FIM
// ROTA DENUNCIA | INICIO 


server.put("/api/alerta", autenticar, (req: AuthRequest, res: Response) => {
    try {
      const id = req.user!.id;
      const { alerta } = req.body;

      // Verifica se veio o parâmetro necessário
      if (typeof alerta === "undefined") {
        return res.sendStatus(400);
      }

      const db = readDB();
      const usuario = db.usuarios.find((u: any) => Number(u.id) === Number(id));

      if (!usuario) {
        return res.sendStatus(404);
      }

      usuario.alerta = alerta; // Atualiza o campo alerta
      writeDB(db);
      return res.sendStatus(200);
    } catch {
      return res.sendStatus(500);
    }
  });

  // --- Confirma CPF e desativa o alerta ---
  // Exige o token de quem está logado E que o CPF digitado bata com o CPF
  // cadastrado para ESSE usuário — não basta saber o CPF de outra pessoa.
  server.post("/api/alerta/confirmar", autenticar, (req: AuthRequest, res: Response) => {
    try {
      const { cpf } = req.body;
      if (!cpf) return res.sendStatus(400);

      const db = readDB();
      const usuario = db.usuarios.find((u: any) => Number(u.id) === Number(req.user!.id));

      if (!usuario) return res.sendStatus(404);
      if (usuario.cpf !== cpf) return res.sendStatus(403);

      usuario.alerta = false;
      writeDB(db);

      return res.sendStatus(200);
    } catch {
      return res.sendStatus(500);
    }
  });

// Inicia o servidor HTTP caso este arquivo seja executado diretamente.
// Usa a porta definida em PORT ou 5001 (padrão usado no frontend).
const PORT = process.env.PORT ? Number(process.env.PORT) : 5001;

function startServer() {
    const httpServer = server.listen(PORT, () => {
        console.log(`[server] App em http://127.0.0.1:${PORT}`);
    });

    httpServer.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[server] A porta ${PORT} já está em uso. Encerre o outro processo ou use PORT=<outra> npm run dev`);
        } else {
            console.error('[server] Erro no servidor:', err);
        }
        process.exit(1);
    });
}

// === NOVA ROTA PARA OBTER SALDO DO USUÁRIO ===
server.get("/api/usuario", autenticar, (req: AuthRequest, res: Response) => {
  try {
    const email = req.user!.email;

    const db = readDB();
    const usuario = db.usuarios.find((u: any) => u.email === email);

    if (!usuario) {
      return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    return res.status(200).json({
      mensagem: "Usuário encontrado",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        saldo: usuario.saldo,
      },
    });
  } catch (error) {
    console.error("[GET /api/usuario] Erro:", error);
    return res.status(500).json({ mensagem: "Erro interno do servidor" });
  }
});

startServer();

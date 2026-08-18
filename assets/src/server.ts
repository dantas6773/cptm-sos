import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = "2h";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-inseguro-defina-JWT_SECRET-no-.env";

if (!process.env.JWT_SECRET) {
    console.warn("[server] JWT_SECRET não definido — usando um valor fixo de desenvolvimento. NÃO use isso em produção.");
}

interface AuthPayload {
    id: number;
    email: string;
}

interface AuthRequest extends Request {
    user?: AuthPayload;
}

function gerarToken(usuario: AuthPayload) {
    return jwt.sign(usuario, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
        req.user = jwt.verify(token, JWT_SECRET) as AuthPayload;
        next();
    } catch {
        return res.status(403).json({ mensagem: "Token inválido ou expirado" });
    }
}

const server = express();

server.use(cors());
server.use(express.json());

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

        const senhaHash = bcrypt.hashSync(senha, SALT_ROUNDS)

        const newUser = {
            id: db.usuarios.length + 1,
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

// --- MODIFICAÇÕES (LOGS) NESTE ENDPOINT ---
server.put("/api/usuario/apelido", autenticar, (req: AuthRequest, res: Response) => {
    try {
        // 1. Log do que o servidor recebeu
        console.log(`[PUT /api/usuario/apelido] Requisição recebida:`, req.body);

        const email = req.user!.email
        const { apelido } = req.body

        if (!apelido) {
            // 2. Log de erro de validação (400)
            console.warn(`[PUT /api/usuario/apelido] Erro 400: Campo faltando. Apelido: ${apelido}`);
            return res.status(400).json({
                mensagem: "Apelido é obrigatório"
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
server.put("/api/usuario/saldo", autenticar, (req: AuthRequest, res: Response) => {
    try {
        const email = req.user!.email
        const { amount } = req.body;

        if (typeof amount === "undefined") {
            return res.status(400).json({ mensagem: "amount é obrigatório" });
        }

        const db = readDB();
        const userIndex = db.usuarios.findIndex((u: any) => u.email === email);

        if (userIndex === -1) {
            return res.status(404).json({ mensagem: "Usuário não encontrado" });
        }

        const atual = Number(db.usuarios[userIndex].saldo || 0);
        db.usuarios[userIndex].saldo = Number((atual + Number(amount)).toFixed(2));
        writeDB(db);

        const { senha: _senha, ...usuarioSafe } = db.usuarios[userIndex];
        return res.status(200).json({ mensagem: "Saldo atualizado com sucesso", usuario: usuarioSafe });
    } catch (error) {
        console.error('[PUT /api/usuario/saldo] Erro:', error);
        return res.status(500).json({ mensagem: "Erro interno do servidor" });
    }
})

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
server.post("/gera-mapa", async (req: Request, res: Response) => {
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
        const py = spawn('python', [scriptPath, ...args], { 
            cwd: __dirname
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
                return res.status(500).json({ 
                    ok: false, 
                    error: 'Erro ao gerar mapa', 
                    code,
                    stderr, 
                    stdout 
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

// servir arquivos estáticos da pasta `assets` para facilitar testes locais
const assetsDir = path.join(__dirname, "..");
server.use(express.static(assetsDir));

// rota raiz útil para abrir direto o mapa
server.get("/", (req: Request, res: Response) => {
	res.redirect('/html/mapa.html');
});

// --- FIM DAS MODIFICAÇÕES ---



// ROTA LOGIN | INICIO

server.post("/api/login", (req: Request, res: Response) => {
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
    try {
        const httpServer = server.listen(PORT, () => {
            console.log(`[server] Escutando em http://127.0.0.1:${PORT}`);
        });

        // Monitora eventos do servidor
        httpServer.on('error', (err) => {
            console.error('[server] Erro no servidor:', err);
        });

        // Tenta reconectar se o servidor cair
        httpServer.on('close', () => {
            console.log('[server] Servidor fechado. Tentando reiniciar...');
            setTimeout(startServer, 5000);
        });

        // Log periódico para confirmar que está rodando
        setInterval(() => {
            console.log('[server] Status: Ativo');
        }, 30000);

    } catch (err) {
        console.error('[server] Erro ao iniciar o servidor:', err);
        // Tenta reiniciar em caso de erro
        setTimeout(startServer, 5000);
    }
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

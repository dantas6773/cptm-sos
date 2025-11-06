import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";

const server = express();

server.use(cors());
server.use(express.json());

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
// aaaaaaa
server.get("/usuario.json", (req: Request, res: Response) => {
    try {
      const db = readDB(); 
      return res.json(db);
    } catch (error) {
      console.error("[GET /usuario.json] Erro ao ler usuario.json:", error);
      return res.status(500).json({ mensagem: "Erro ao ler usuario.json" });
    }
  });
// rota raiz útil para abrir direto o mapa
server.get("/", (req: Request, res: Response) => {
	res.redirect('/html/mapa.html');
});

    server.listen(5001, () => {
    console.log("Rodando na porta 5001")
    })

// --- FIM DAS MODIFICAÇÕES ---



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


server.put("/api/alerta", (req: Request, res: Response) => {
    try {
      const { id, alerta } = req.body;
  
      // Verifica se vieram os parâmetros necessários
      if (typeof id === "undefined" || typeof alerta === "undefined") {
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
  server.post("/api/alerta/confirmar", (req: Request, res: Response) => {
    try {
      const { cpf } = req.body;
      if (!cpf) return res.sendStatus(400);
  
      const db = readDB();
      const usuario = db.usuarios.find((u: any) => u.cpf === cpf);
  
      if (!usuario) return res.sendStatus(404);
  
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
try {
    server.listen(PORT, () => {
        console.log(`[server] Escutando em http://127.0.0.1:${PORT}`);
    });
} catch (err) {
    console.error('[server] Erro ao iniciar o servidor:', err);
}

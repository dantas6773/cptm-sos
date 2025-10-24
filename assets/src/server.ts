import express, { Request, Response } from "express"
import cors from 'cors'
import fs from 'fs'
import path from 'path'

const server = express()

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
// --- FIM DAS MODIFICAÇÕES ---

server.listen(5001, () => {
    console.log('Servidor rodando na porta 5001')
})
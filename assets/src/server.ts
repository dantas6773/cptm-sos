import express, { Request, Response } from "express"
import cors from 'cors'
import fs from 'fs'
import path from 'path'

const server = express()

server.use(express.json())
server.use(cors())

function readDB() {
    const dbPath = path.join(__dirname, 'usuario.json')
    const data = fs.readFileSync(dbPath, 'utf-8')
    return JSON.parse(data)
}

function writeDB(data: any) {
    const dbPath = path.join(__dirname, 'usuario.json')
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
            nome: email.split('@')[0],
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
        console.error(error)
        res.status(500).json({
            mensagem: "Erro interno do servidor"
        })
    }
})

server.listen(5001, () => {
    console.log('Servidor rodando na porta 5001')
})
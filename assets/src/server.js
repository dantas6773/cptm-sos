"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var path_1 = require("path");
var fs_1 = require("fs");
var cors_1 = require("cors");
var server = (0, express_1.default)();
server.use((0, cors_1.default)());
server.use(express_1.default.json());
function readDB() {
    var dbPath = path_1.default.join(__dirname, 'usuario.json');
    // Adicionado log para verificar se o caminho do DB está correto
    // console.log(`[DB] Lendo banco de dados em: ${dbPath}`); 
    var data = fs_1.default.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
}
function writeDB(data) {
    var dbPath = path_1.default.join(__dirname, 'usuario.json');
    // console.log(`[DB] Escrevendo no banco de dados em: ${dbPath}`);
    fs_1.default.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}
server.post("/api/cadastro", function (req, res) {
    try {
        var _a = req.body, email_1 = _a.email, cpf_1 = _a.cpf, senha = _a.senha;
        if (!email_1 || !cpf_1 || !senha) {
            return res.status(400).json({
                mensagem: "Todos os campos são obrigatórios"
            });
        }
        var db = readDB();
        var userExists = db.usuarios.some(function (user) {
            return user.email === email_1 || user.cpf === cpf_1;
        });
        if (userExists) {
            return res.status(400).json({
                mensagem: "Usuário já cadastrado"
            });
        }
        var newUser = {
            id: db.usuarios.length + 1,
            nome: "Temporário",
            cpf: cpf_1,
            email: email_1,
            senha: senha,
            saldo: 0,
            alerta: false
        };
        db.usuarios.push(newUser);
        writeDB(db);
        res.status(201).json({
            mensagem: "Cadastro realizado com sucesso",
            usuario: newUser
        });
    }
    catch (error) {
        console.error('[POST /api/cadastro] Erro:', error); // Log de erro
        res.status(500).json({
            mensagem: "Erro interno do servidor"
        });
    }
});
// --- MODIFICAÇÕES (LOGS) NESTE ENDPOINT ---
server.put("/api/usuario/apelido", function (req, res) {
    try {
        // 1. Log do que o servidor recebeu
        console.log("[PUT /api/usuario/apelido] Requisi\u00E7\u00E3o recebida:", req.body);
        var _a = req.body, email_2 = _a.email, apelido = _a.apelido;
        if (!email_2 || !apelido) {
            // 2. Log de erro de validação (400)
            console.warn("[PUT /api/usuario/apelido] Erro 400: Campos faltando. Email: ".concat(email_2, ", Apelido: ").concat(apelido));
            return res.status(400).json({
                mensagem: "Email e apelido são obrigatórios"
            });
        }
        var db = readDB();
        // 3. Log da busca no DB
        console.log("[PUT /api/usuario/apelido] Procurando por email: ".concat(email_2));
        var userIndex = db.usuarios.findIndex(function (user) { return user.email === email_2; });
        if (userIndex === -1) {
            // 4. Log de usuário não encontrado (404)
            console.warn("[PUT /api/usuario/apelido] Erro 404: Email ".concat(email_2, " n\u00E3o encontrado no banco de dados."));
            return res.status(404).json({
                mensagem: "Usuário não encontrado"
            });
        }
        // 5. Log de sucesso
        console.log("[PUT /api/usuario/apelido] Usu\u00E1rio encontrado (\u00CDndice: ".concat(userIndex, "). Atualizando nome para: ").concat(apelido));
        db.usuarios[userIndex].nome = apelido;
        writeDB(db);
        return res.status(200).json({
            mensagem: "Apelido atualizado com sucesso"
        });
    }
    catch (error) {
        // 6. Log de erro interno (500)
        console.error('[PUT /api/usuario/apelido] Erro 500 (Catch):', error);
        return res.status(500).json({
            mensagem: "Erro interno do servidor"
        });
    }
});
//Rota put para adicioanr saldo
server.put("/api/usuario/saldo", function (req, res) {
    try {
        var _a = req.body, id_1 = _a.id, amount = _a.amount;
        if (typeof id_1 === "undefined" || typeof amount === "undefined") {
            return res.status(400).json({ mensagem: "id e amount são obrigatórios" });
        }
        var db = readDB();
        var userIndex = db.usuarios.findIndex(function (u) { return Number(u.id) === Number(id_1); });
        if (userIndex === -1) {
            return res.status(404).json({ mensagem: "Usuário não encontrado" });
        }
        var atual = Number(db.usuarios[userIndex].saldo || 0);
        db.usuarios[userIndex].saldo = Number((atual + Number(amount)).toFixed(2));
        writeDB(db);
        return res.status(200).json({ mensagem: "Saldo atualizado com sucesso", usuario: db.usuarios[userIndex] });
    }
    catch (error) {
        console.error('[PUT /api/usuario/saldo] Erro:', error);
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
server.get("/api/estacoes", function (req, res) {
    try {
        // carrega e parseia estacoes.json
        var filePath = path_1.default.join(__dirname, "estacoes.json");
        var raw = fs_1.default.readFileSync(filePath, "utf8");
        var linhas = JSON.parse(raw);
        // extrai nomes de estações de todas as linhas
        var nomes_1 = [];
        linhas.forEach(function (linha) {
            if (Array.isArray(linha.trajeto)) {
                linha.trajeto.forEach(function (estacao) { return nomes_1.push(estacao); });
            }
        });
        // remove duplicatas e ordena alfabeticamente (pt-BR)
        var unique = Array.from(new Set(nomes_1))
            .sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
        return res.json(unique);
    }
    catch (err) {
        console.error("Erro ao ler estacoes.json:", err);
        return res.status(500).json({
            error: "Erro ao ler estações",
            details: err instanceof Error ? err.message : String(err)
        });
    }
});
/**
 * POST /gera-mapa
 * Gera mapa de rota entre duas estações.
 *
 * Recebe: { origin: string, destination: string }
 * Executa script Python mapa_estacoes.py para gerar HTML
 * com mapa interativo mostrando a rota.
 *
 * Retorna: { ok: true, url: string } em caso de sucesso,
 * onde url aponta para o HTML gerado.
 */
server.post("/gera-mapa", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, origin, destination, spawn, scriptPath, args, py, stdout_1, stderr_1, err_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body || {}, origin = _a.origin, destination = _a.destination;
                if (!origin || !destination) {
                    return [2 /*return*/, res.status(400).json({
                            ok: false,
                            error: "origin e destination são obrigatórios"
                        })];
                }
                console.log("Gera mapa solicitado:", origin, "->", destination);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require('child_process'); })];
            case 2:
                spawn = (_b.sent()).spawn;
                scriptPath = path_1.default.join(__dirname, 'mapa_estacoes.py');
                args = [
                    '--start', origin,
                    '--end', destination
                ];
                py = spawn('python', __spreadArray([scriptPath], args, true), {
                    cwd: __dirname
                });
                stdout_1 = '';
                stderr_1 = '';
                // captura saída em tempo real
                py.stdout.on('data', function (data) {
                    var text = data.toString();
                    stdout_1 += text;
                    console.log('[Python stdout]', text.trim());
                });
                py.stderr.on('data', function (data) {
                    var text = data.toString();
                    stderr_1 += text;
                    console.error('[Python stderr]', text.trim());
                });
                // aguarda término e retorna resultado
                py.on('close', function (code) {
                    console.log("Python process exited with code ".concat(code));
                    if (code === 0) {
                        // sucesso: mapa em assets/src/mapa_rota.html
                        var url = "/src/mapa_rota.html";
                        return res.json({
                            ok: true,
                            origin: origin,
                            destination: destination,
                            url: url,
                            output: stdout_1
                        });
                    }
                    else {
                        // erro: retorna detalhes para debug
                        return res.status(500).json({
                            ok: false,
                            error: 'Erro ao gerar mapa',
                            code: code,
                            stderr: stderr_1,
                            stdout: stdout_1
                        });
                    }
                });
                return [3 /*break*/, 4];
            case 3:
                err_1 = _b.sent();
                // erro ao executar Python
                console.error('Erro ao executar script python:', err_1);
                return [2 /*return*/, res.status(500).json({
                        ok: false,
                        error: 'Erro interno ao executar script',
                        details: err_1 instanceof Error ? err_1.message : String(err_1)
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
// servir arquivos estáticos da pasta `assets` para facilitar testes locais
var assetsDir = path_1.default.join(__dirname, "..");
server.use(express_1.default.static(assetsDir));
// aaaaaaa
server.get("/usuario.json", function (req, res) {
    try {
        var db = readDB();
        return res.json(db);
    }
    catch (error) {
        console.error("[GET /usuario.json] Erro ao ler usuario.json:", error);
        return res.status(500).json({ mensagem: "Erro ao ler usuario.json" });
    }
});
// rota raiz útil para abrir direto o mapa
server.get("/", function (req, res) {
    res.redirect('/html/mapa.html');
});
// --- FIM DAS MODIFICAÇÕES ---
// ROTA LOGIN | INICIO
server.post("/api/login", function (req, res) {
    try {
        console.log("[POST /api/login] Requisi\u00E7\u00E3o recebida:", req.body);
        var _a = req.body, email_3 = _a.email, senha = _a.senha;
        if (!email_3 || !senha) {
            console.warn("[POST /api/login] Erro 400: Campos faltando. Email: ".concat(email_3));
            return res.status(400).json({ mensagem: "Email e senha são obrigatórios" });
        }
        var db = readDB();
        var user = db.usuarios.find(function (u) { return u.email === email_3; });
        if (!user) {
            console.warn("[POST /api/login] Erro 404: Email ".concat(email_3, " n\u00E3o encontrado."));
            return res.status(404).json({ mensagem: "Usuário não encontrado" });
        }
        if (user.senha !== senha) {
            console.warn("[POST /api/login] Erro 401: Senha incorreta para ".concat(email_3, "."));
            return res.status(401).json({ mensagem: "Credenciais inválidas" });
        }
        // Remover a senha do objeto retornado
        var _ = user.senha, userSafe = __rest(user, ["senha"]);
        console.log("[POST /api/login] Login bem-sucedido: ".concat(email_3));
        return res.status(200).json({
            mensagem: "Login efetuado com sucesso",
            usuario: userSafe
        });
    }
    catch (error) {
        console.error('[POST /api/login] Erro:', error);
        return res.status(500).json({ mensagem: "Erro interno do servidor" });
    }
});
// ROTA LOGIN | FIM
// ROTA DENUNCIA | INICIO 
server.put("/api/alerta", function (req, res) {
    try {
        var _a = req.body, id_2 = _a.id, alerta = _a.alerta;
        // Verifica se vieram os parâmetros necessários
        if (typeof id_2 === "undefined" || typeof alerta === "undefined") {
            return res.sendStatus(400);
        }
        var db = readDB();
        var usuario = db.usuarios.find(function (u) { return Number(u.id) === Number(id_2); });
        if (!usuario) {
            return res.sendStatus(404);
        }
        usuario.alerta = alerta; // Atualiza o campo alerta
        writeDB(db);
        return res.sendStatus(200);
    }
    catch (_b) {
        return res.sendStatus(500);
    }
});
// --- Confirma CPF e desativa o alerta ---
server.post("/api/alerta/confirmar", function (req, res) {
    try {
        var cpf_2 = req.body.cpf;
        if (!cpf_2)
            return res.sendStatus(400);
        var db = readDB();
        var usuario = db.usuarios.find(function (u) { return u.cpf === cpf_2; });
        if (!usuario)
            return res.sendStatus(404);
        usuario.alerta = false;
        writeDB(db);
        return res.sendStatus(200);
    }
    catch (_a) {
        return res.sendStatus(500);
    }
});

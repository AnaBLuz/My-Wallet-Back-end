import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import joi from "joi";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';


const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();
uuid();

// Conexão com o banco de dados 

const mongoClient = new MongoClient(process.env.MONGO_URI)
try {
    await mongoClient.connect()
    console.log('MongoDB conectado!')
} catch (err) {
    console.log(err.message)
}

const db = mongoClient.db()

//Validações
const cadastroSchema = joi.object({
    nome:joi.string().min(3),
    email:joi.string().email({minDomainSegments: 2,
        tlds: { allow: ["com", "net", "br"] },
      }),
    senha:joi.string().min(3)
}) 




// endpoints
app.post("/cadastro", async (req, res) => {
    const {nome,email,senha} = req.body
    const validation = cadastroSchema.validate(req.body)
    if (validation.error) return res.sendStatus(422)
    const hash = bcrypt.hashSync(senha, 10);     
    try{
        const usuario = await db.collection("usuarios").findOne({email})
        if(usuario) return res.status(409).send("Usuario já existe!")

        await db.collection("usuarios").insertOne({nome,email,senha: hash})
        return res.status(201).send("Usuário criado com sucesso!");

    }
    catch (err) {
        res.status(500).send(err.message)
    }
    
  })
app.post("/", async(req,res) => {
    const {email, senha} = req.body

    try{
        const usuario = await db.collection("usuarios").findOne({email})
        if(!usuario) return res.status(404).send("Usuário não cadastrado!")

        const senhaCorreta = bcrypt.compareSync(senha,usuario.senha)
        if(!senhaCorreta) return res.status(401).send("Não autorizado, senha incorreta")
        
        const token = uuid() 
        await db.collection("sessoes").insertOne({idUsuario: usuario._id, token})
        return res.status(200).send(token)
    
    }
    catch (err) {
        res.status(500).send(err.message)
    }
    

})
  
const port = process.env.PORT || 5000

app.listen(port, () => console.log("Servidor rodando"))
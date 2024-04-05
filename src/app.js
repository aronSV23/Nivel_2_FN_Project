import express from 'express'
import fs from 'fs'
import path from 'path'
import swaggerUi from 'swagger-ui-express'
import categories from './routes/categories.routes.js'
import comments from './routes/comments.routes.js'
import posts from './routes/posts.routes.js'
import users from './routes/users.routes.js'

const app = express()
app.use(express.json())

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5500')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE')
  next()
})

// Cargar archivo JSON de Swagger
const pathToFile = path.resolve('./src/config/swagger/swagger-output.json')
const swaggerFile = await fs.promises.readFile(pathToFile, 'utf8').then(JSON.parse)

// Configurar Swagger UI
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile))

app.use('/api/users', users)
app.use('/api/posts', posts)
app.use('/api/comments', comments)
app.use('/api/categories', categories)

app.use((req, res, next) => {
  res.status(404).json({ message: 'End point not found' })
})

export default app

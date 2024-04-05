import fs from 'node:fs/promises'
import path from 'node:path'
import { pool } from '../config/db.js'

export const getUsers = async (req, res) => {
  try {
    // Obtenemos los datos de los usuarios de la base de datos
    const [rows] = await pool.query('SELECT u.id, u.username, u.name, u.last_name, u.email, r.role_name, u.profile_picture FROM users u INNER JOIN roles r ON u.role_id = r.id')
    res.json(rows)
  } catch (error) {
    return res.status(500).json({ message: 'Someting goes wrong' })
  }
}

export const getUser = async (req, res) => {
  try {
    const { id } = req.params

    // Validamos el id
    if (isNaN(parseInt(id))) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Obtenemos los datos de usuario de la base de datos
    const [rows] = await pool.execute('SELECT u.id, u.username, u.name, u.last_name, u.email, r.role_name, u.profile_picture FROM users u INNER JOIN roles r ON u.role_id = r.id WHERE u.id = ?', [id])

    if (rows.length <= 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json(rows[0])
  } catch (error) {
    return res.status(500).json({ message: 'Someting goes wrong' })
  }
}

export const getUserImageProfile = async (req, res) => {
  try {
    const { filename } = req.params
    const absolutePath = path.resolve(path.normalize(`./uploads/${filename}`))

    await fs.access(absolutePath, fs.constants.F_OK)

    // Si no hay error al acceder al archivo, significa que existe
    return res.sendFile(absolutePath)
  } catch (error) {
    // Si hay error, significa que no existe
    return res.status(404).json({ message: 'Image not found' })
  }
}

export const createUser = async (req, res) => {
  try {
    // Extraer los datos enviados desde POST
    const { username, name, last_name: lastName, email, password, birthdate, role_id: role } = req.body
    const { filename } = req.file

    // Validación de los datos
    if (!username || !name || !lastName || !email?.includes('@') || !password || !birthdate || !role || !filename) {
      await fs.unlink(path.normalize(`uploads/${filename}`))
      return res.status(400).json({ message: 'missing data.' })
    }

    // Ingresar los datos a la db
    const [result] = await pool.execute(
      'INSERT INTO users (username, name, last_name, email, password, birthdate, role_id, profile_picture) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [username, name, lastName, email, password, birthdate, role, filename])

    // Validar el id del registro insertado
    if (!result.insertId) {
      await fs.unlink(path.normalize(`uploads/${filename}`))
      return res.status(500).json({ message: 'Error creating user.' })
    }

    // Traer el usuario insertado
    const [user] = await pool.execute(
      'SELECT username, name, last_name, email, role_id, profile_picture FROM users WHERE id = ?',
      [result.insertId]
    )

    // Mensaje al cliente
    res.status(201).json({ message: 'User created.', user })
  } catch (error) {
    console.log(error)
    let message = 'Internal Error'
    let statusCode = 500

    // Borrar la imagen si ocurre un error
    await fs.unlink(path.normalize(`uploads/${req.file.filename}`))

    // Validar si el error es por un dato duplicado. Si es así, cambiar el mensaje y código de error.
    if (error?.errno === 1062) {
      message = error.sqlMessage.split(' ')[5] + ' already exists'
      statusCode = 400
    }

    // Validar si el error es por un dato faltante. Si es así, cambiar el mensaje y código de error.
    if (error?.errno === 1048) {
      message = error.sqlMessage
      statusCode = 400
    }

    res.status(statusCode).json({ message })
  }
}

export const updateUser = async (req, res) => {
  try {
    // Extraer los datos enviados
    const { id } = req.params
    const { username, name, last_name: lastName, email, password, birthdate, role_id: role } = req.body
    let filename = null
    if (!(req.file === undefined)) {
      filename = req.file.filename
    }

    // Validamos el id
    if (isNaN(parseInt(id))) {
      await fs.unlink(path.normalize(`uploads/${filename}`))
      return res.status(404).json({ message: 'User not found' })
    }

    // Validación de los datos
    if (!email?.includes('@')) {
      await fs.unlink(path.normalize(`uploads/${filename}`))
      return res.status(400).json({ message: 'Invalid email.' })
    }

    // Actualizamos los datos a la db
    const [result] = await pool.execute('UPDATE users SET username = IFNULL(?, username), name = IFNULL(?, name), last_name = IFNULL(?, last_name), email = IFNULL(?, email), password = IFNULL(?, password), birthdate = IFNULL(?, birthdate), role_id = IFNULL(?, role_id), profile_picture = IFNULL(?, profile_picture) WHERE id = ?', [username, name, lastName, email, password, birthdate, role, filename, id])

    if (result.affectedRows <= 0) {
      await fs.unlink(path.normalize(`uploads/${filename}`))
      return res.status(500).json({ message: 'Error updating user data.' })
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id])
    res.send(rows[0])
  } catch (error) {
    console.log(error)
    let message = 'Internal Error'
    let statusCode = 500

    // Borrar la imagen si ocurre un error
    await fs.unlink(path.normalize(`uploads/${req.file.filename}`))

    // Validar si el error es por un dato duplicado. Si es así, cambiar el mensaje y código de error.
    if (error?.errno === 1062) {
      message = error.sqlMessage.split(' ')[5] + ' already exists'
      statusCode = 400
    }

    // Validar si el error es por un dato faltante. Si es así, cambiar el mensaje y código de error.
    if (error?.errno === 1048) {
      message = error.sqlMessage
      statusCode = 400
    }

    res.status(statusCode).json({ message })
  }
}

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    const { userEmail, userPassword } = req.body

    const [user] = await pool.execute('SELECT * FROM users WHERE email = ? AND password = ?', [userEmail, userPassword])
    console.log(user)

    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (!(user[0].role_id === 2 || user[0].id === parseInt(id))) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' })
    }

    // Obtenemos el filename de usuario de la base de datos
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id])
    const fileName = rows[0].profile_picture

    // Validamos el id
    if (isNaN(parseInt(id))) {
      return res.status(404).json({ message: 'User not found' })
    }

    await pool.query('DELETE FROM comments WHERE user_id = ?', [id])
    await pool.execute('DELETE cp FROM categories_posts cp INNER JOIN posts p ON cp.post_id = p.id WHERE p.autor_id = ?;', [id])
    await pool.execute('DELETE c FROM comments c INNER JOIN posts p ON c.post_id = p.id WHERE p.autor_id = ?;', [id])
    await pool.execute('DELETE FROM posts WHERE autor_id = ?', [id])
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id])
    if (result.affectedRows <= 0) {
      return res.status(500).json({ message: 'Error al eliminar al usuario de la db.' })
    }

    await fs.unlink(path.normalize(`uploads/${fileName}`))

    res.sendStatus(204)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Someting goes wrong' })
  }
}

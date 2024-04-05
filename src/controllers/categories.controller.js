import { pool } from '../config/db.js'

export const getCategories = async (req, res) => {
  try {
    // Obtenemos los datos de los usuarios de la base de datos
    const [rows] = await pool.query('SELECT id AS category_id, category_name FROM categories;')
    res.json(rows)
  } catch (error) {
    return res.status(500).json({ message: 'Someting goes wrong' })
  }
}

export const createCategory = async (req, res) => {
  try {
    const { category_name: categoryName, userEmail, userPassword } = req.body

    const [user] = await pool.execute('SELECT * FROM users WHERE email = ? AND password = ?', [userEmail, userPassword])

    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (!(user[0].role_id === 2)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' })
    }

    // Validación de los datos
    if (!categoryName) {
      return res.status(400).json({ message: 'missing data.' })
    }

    const [category] = await pool.execute('INSERT INTO categories ( category_name ) VALUES (?);', [categoryName])

    // Validar el id del registro insertado
    if (!category.insertId) {
      return res.status(500).json({ message: 'Error creating category.' })
    }

    res.status(201).json({ message: 'Category created.' })
  } catch (error) {
    let message = 'Internal Error'
    let statusCode = 500

    // Validar si el error es por un dato faltante. Si es así, cambiar el mensaje y código de error.
    if (error?.errno === 1048) {
      message = error.sqlMessage
      statusCode = 400
    }

    res.status(statusCode).json({ message })
  }
}

export const updateCategory = async (req, res) => {
  try {
    const { category_id: id } = req.params
    const { category_name: categoryName, userEmail, userPassword } = req.body

    const [user] = await pool.execute('SELECT * FROM users WHERE email = ? AND password = ?', [userEmail, userPassword])

    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (!(user[0].role_id === 2)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' })
    }

    const [category] = await pool.execute('SELECT * FROM categories WHERE id = ?;', [id])

    if (category.length === 0) {
      return res.status(401).json({ message: 'Category not found' })
    }

    // Validación de los datos
    if (!categoryName) {
      return res.status(400).json({ message: 'missing data.' })
    }

    const [result] = await pool.execute('UPDATE categories SET category_name = IFNULL(?, category_name) WHERE id = ?;', [categoryName, id])
    console.log(result)

    // Validar el id del registro insertado
    if (!result.affectedRows) {
      return res.status(500).json({ message: 'Error creating category.' })
    }

    res.status(201).json({ message: 'Category updated.' })
  } catch (error) {
    let message = 'Internal Error'
    let statusCode = 500

    // Validar si el error es por un dato faltante. Si es así, cambiar el mensaje y código de error.
    if (error?.errno === 1048) {
      message = error.sqlMessage
      statusCode = 400
    }

    res.status(statusCode).json({ message })
  }
}

export const deleteCategory = async (req, res) => {
  try {
    const { category_id: id } = req.params
    const { userEmail, userPassword } = req.body

    const [user] = await pool.execute('SELECT * FROM users WHERE email = ? AND password = ?', [userEmail, userPassword])

    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (!(user[0].role_id === 2)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' })
    }

    const [category] = await pool.execute('SELECT * FROM categories WHERE id = ?;', [id])

    if (category.length === 0) {
      return res.status(401).json({ message: 'Category not found' })
    }

    const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id])
    if (result.affectedRows <= 0) {
      return res.status(500).json({ message: 'Error al eliminar la categoria de la db.' })
    }

    res.sendStatus(204)
  } catch (error) {
    let message = 'Internal Error'
    let statusCode = 500

    // Validar si el error es por un dato faltante. Si es así, cambiar el mensaje y código de error.
    if (error?.errno === 1048) {
      message = error.sqlMessage
      statusCode = 400
    }

    res.status(statusCode).json({ message })
  }
}

import { pool } from '../config/db.js'

export const getPostComments = async (req, res) => {
  try {
    const { post_id: id } = req.params

    // Validamos el id
    if (isNaN(parseInt(id))) {
      return res.status(404).json({ message: 'Post not found' })
    }

    // Obtenemos los datos del post de la base de datos
    const [post] = await pool.execute(`
    SELECT p.id, p.title, p.content, u.username AS autor, p.create_date
    FROM posts p
    LEFT JOIN users u ON p.autor_id = u.id WHERE p.id = ?;
    `, [id])

    if (post.length <= 0) {
      return res.status(404).json({ message: 'Post not found' })
    }

    const [comments] = await pool.execute(`
    SELECT c.id AS comment_id, c.content, p.id AS post_id, u.id AS user_id, u.username, p.create_date 
    FROM posts p 
    INNER JOIN comments c ON p.id = c.post_id 
    INNER JOIN users u ON u.id = c.user_id WHERE p.id = ?;
    `, [id])

    res.json(comments)
  } catch (error) {
    return res.status(500).json({ message: 'Someting goes wrong' })
  }
}

export const addPostComments = async (req, res) => {
  try {
    const { post_id: id } = req.params
    // Extraer los datos enviados desde POST
    const { content, user_id: autor } = req.body

    // Validamos el id
    if (isNaN(parseInt(id))) {
      return res.status(404).json({ message: 'Post not found' })
    }

    // Obtenemos los datos del post de la base de datos
    const [post] = await pool.execute(`
    SELECT p.id, p.title, p.content, u.username AS autor, p.create_date
    FROM posts p
    LEFT JOIN users u ON p.autor_id = u.id WHERE p.id = ?;
    `, [id])

    if (post.length <= 0) {
      return res.status(404).json({ message: 'Post not found' })
    }

    // Validación de los datos
    if (!content || (isNaN(parseInt(autor)))) {
      return res.status(400).json({ message: 'missing data.' })
    }

    // Ingresar los datos a la db
    const [result] = await pool.execute('INSERT INTO comments ( content, post_id, user_id ) VALUES (?, ?, ?)', [content, id, autor])

    // Validar el id del registro insertado
    if (!result.insertId) {
      return res.status(500).json({ message: 'Error creating comment.' })
    }

    const [categories] = await pool.execute(`
    SELECT cp.id AS category_post_id, c.id AS category_id, c.category_name
    FROM posts p 
    INNER JOIN categories_posts cp ON p.id = cp.post_id 
    INNER JOIN categories c ON c.id = cp.category_id WHERE p.id = ?;
    `, [id])

    const [comments] = await pool.execute(`
    SELECT c.id AS comment_id, c.content, p.id AS post_id, u.id AS user_id, u.username, p.create_date 
    FROM posts p 
    INNER JOIN comments c ON p.id = c.post_id 
    INNER JOIN users u ON u.id = c.user_id WHERE p.id = ?;
    `, [id])

    post[0].categories = categories

    post[0].comments = comments

    // Mensaje al cliente
    res.status(201).json({ message: 'Comment created.', post })
  } catch (error) {
    let message = 'Internal Error'
    let statusCode = 500

    // Validar si el error es por un categoria no valida. Si es así, cambiar el mensaje y código de error.
    if (error?.errno === 1452) {
      message = 'Wrong post or user id'
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

export const updatePostComments = async (req, res) => {
  try {
    const { comment_id: id } = req.params
    // Extraer los datos enviados desde POST
    const { content, userEmail, userPassword } = req.body

    // Validamos el id
    if (isNaN(parseInt(id))) {
      return res.status(404).json({ message: 'Wrong comment id' })
    }

    // Obtenemos los datos del comentario de la base de datos
    const [comment] = await pool.execute('SELECT * FROM comments WHERE id = ?;', [id])

    if (comment.length <= 0) {
      return res.status(404).json({ message: 'comment not found' })
    }

    const [user] = await pool.execute('SELECT * FROM users WHERE email = ? AND password = ?', [userEmail, userPassword])

    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (!(user[0].role_id === 2 || user[0].id === comment[0].user_id)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' })
    }

    // Validación de los datos
    if (!content) {
      return res.status(400).json({ message: 'missing data.' })
    }

    // Actualizamos los datos a la db
    const [result] = await pool.execute('UPDATE comments SET content = IFNULL(?, content) WHERE id = ?', [content, id])

    if (result.affectedRows <= 0) {
      return res.status(500).json({ message: 'Error updating post data.' })
    }

    // Obtenemos los datos del post de la base de datos
    const [post] = await pool.execute(`
        SELECT p.id, p.title, p.content, u.username AS autor, p.create_date
        FROM posts p
        LEFT JOIN users u ON p.autor_id = u.id WHERE p.id = ?;
        `, [comment[0].post_id])

    const [categories] = await pool.execute(`
        SELECT cp.id AS category_post_id, c.id AS category_id, c.category_name
        FROM posts p 
        INNER JOIN categories_posts cp ON p.id = cp.post_id 
        INNER JOIN categories c ON c.id = cp.category_id WHERE p.id = ?;
        `, [comment[0].post_id])

    const [comments] = await pool.execute(`
        SELECT c.id AS comment_id, c.content, p.id AS post_id, u.id AS user_id, u.username, p.create_date 
        FROM posts p 
        INNER JOIN comments c ON p.id = c.post_id 
        INNER JOIN users u ON u.id = c.user_id WHERE p.id = ?;
        `, [comment[0].post_id])

    post[0].categories = categories

    post[0].comments = comments

    // Mensaje al cliente
    res.status(201).json({ message: 'Comment updated.', post })
  } catch (error) {
    let message = 'Internal Error'
    let statusCode = 500

    // Validar si el error es por un categoria no valida. Si es así, cambiar el mensaje y código de error.
    if (error?.errno === 1452) {
      message = 'Wrong comment id'
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

export const deletePostComments = async (req, res) => {
  try {
    const { comment_id: id } = req.params
    const { userEmail, userPassword } = req.body

    // Validamos el id
    if (isNaN(parseInt(id))) {
      return res.status(404).json({ message: 'Wrong comment id' })
    }

    // Obtenemos los datos del comentario de la base de datos
    const [comment] = await pool.execute('SELECT * FROM comments WHERE id = ?;', [id])

    if (comment.length <= 0) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    const [user] = await pool.execute('SELECT * FROM users WHERE email = ? AND password = ?', [userEmail, userPassword])

    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (!(user[0].role_id === 2 || user[0].id === comment[0].user_id)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' })
    }

    const [result] = await pool.query('DELETE FROM comments WHERE id = ?', [id])
    if (result.affectedRows <= 0) {
      return res.status(500).json({ message: 'Error al eliminar comentario del post de la db.' })
    }

    res.sendStatus(204)
  } catch (error) {
    return res.status(500).json({ message: 'Someting goes wrong' })
  }
}

import { pool } from '../config/db.js'

export const getPosts = async (req, res) => {
  try {
    // Obtenemos los datos de los post de la base de datos
    const [posts] = await pool.query(`
    SELECT p.id, p.title, p.content, u.username AS autor, p.create_date
    FROM posts p
    LEFT JOIN users u ON p.autor_id = u.id;
    `)

    const [categories] = await pool.query(`
    SELECT cp.id AS category_post_id, cp.post_id, p.title, c.id AS category_id, c.category_name
    FROM posts p 
    INNER JOIN categories_posts cp ON p.id = cp.post_id 
    INNER JOIN categories c ON c.id = cp.category_id;
    `)

    for (const post of posts) {
      const categoriesFiltered = categories.filter(category => category.post_id === post.id)
      const categoriesFinalFiltered = categoriesFiltered.map(element => {
        return { category_post_id: element.category_post_id, category_id: element.category_id, category_name: element.category_name }
      })
      post.categories = categoriesFinalFiltered
    }

    const [comments] = await pool.query(`
    SELECT c.id AS comment_id, c.content, p.id AS post_id, u.id AS user_id, u.username, p.create_date FROM posts p 
    INNER JOIN comments c ON p.id = c.post_id 
    INNER JOIN users u ON u.id = c.user_id;
    `)

    for (const post of posts) {
      const commentsFiltered = comments.filter(comment => comment.post_id === post.id)
      post.comments = commentsFiltered
    }

    res.json(posts)
  } catch (error) {
    return res.status(500).json({ message: 'Someting goes wrong' })
  }
}

export const getPostById = async (req, res) => {
  try {
    const { id } = req.params

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

    if (post.length <= 0) {
      return res.status(404).json({ message: 'Post not found' })
    }

    res.json(post[0])
  } catch (error) {
    return res.status(500).json({ message: 'Someting goes wrong' })
  }
}

export const getPostByCategory = async (req, res) => {
  try {
    const { category_id: categoryId } = req.params

    // Validamos el id de la categoria
    if (isNaN(parseInt(categoryId))) {
      return res.status(404).json({ message: 'Category not found' })
    }

    // Obtenemos los datos del post de la base de datos
    const [posts] = await pool.execute(`
    SELECT p.id, p.title, p.content, u.username AS autor, p.create_date
    FROM posts p
    LEFT JOIN users u ON p.autor_id = u.id
    INNER JOIN categories_posts cp ON p.id = cp.post_id
    INNER JOIN categories c ON c.id = cp.category_id
    WHERE c.id = ?;
    `, [categoryId])

    if (posts.length <= 0) {
      return res.status(404).json({ message: 'Post not found' })
    }

    res.json(posts)
  } catch (error) {
    return res.status(500).json({ message: 'Someting goes wrong' })
  }
}

export const getPostByTitle = async (req, res) => {
  try {
    const { search } = req.params

    console.log(search)

    // Obtenemos los datos del post de la base de datos
    const [posts] = await pool.execute(
      `SELECT p.id, p.title, p.content, u.username AS autor, p.create_date
      FROM posts p
      LEFT JOIN users u ON p.autor_id = u.id
      WHERE p.title LIKE ?;`,
      [`%${search}%`]
    )

    if (posts.length <= 0) {
      return res.status(404).json({ message: 'Post not found' })
    }

    res.json(posts)
  } catch (error) {
    return res.status(500).json({ message: 'Someting goes wrong' })
  }
}

export const createPost = async (req, res) => {
  try {
    // Extraer los datos enviados desde POST
    const { title, content, autor_id: autor } = req.body

    // Validación de los datos
    if (!title || !content || (isNaN(parseInt(autor)))) {
      return res.status(400).json({ message: 'missing data.' })
    }

    // Ingresar los datos a la db
    const [result] = await pool.execute(
      'INSERT INTO posts (title, content, autor_id ) VALUES (?, ?, ?)', [title, content, autor])

    // Validar el id del registro insertado
    if (!result.insertId) {
      return res.status(500).json({ message: 'Error creating post.' })
    }

    // Traer el post insertado
    const [post] = await pool.execute(`
    SELECT p.id, p.title, p.content, u.username AS autor, p.create_date
    FROM posts p
    LEFT JOIN users u ON p.autor_id = u.id  WHERE p.id = ?;
    `, [result.insertId])

    // Mensaje al cliente
    res.status(201).json({ message: 'Post created.', post })
  } catch (error) {
    let message = 'Internal Error'
    let statusCode = 500

    // Validar si el error es por un categoria no valida. Si es así, cambiar el mensaje y código de error.
    if (error?.errno === 1452) {
      message = 'Wrong category or user id'
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

export const addCategoryToPost = async (req, res) => {
  try {
    // Extraer los datos enviados desde POST
    const { post_id: id } = req.params
    const { category_id: categoryId, userEmail, userPassword } = req.body

    const [postVerification] = await pool.execute('SELECT * FROM posts WHERE id = ?', [id])
    // Validamos el id
    if (isNaN(parseInt(id)) || postVerification.length === 0) {
      return res.status(404).json({ message: 'Post not found' })
    }

    // Validación de los datos y credenciales
    const [user] = await pool.execute('SELECT * FROM users WHERE email = ? AND password = ?', [userEmail, userPassword])

    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (!(user[0].role_id === 2 || user[0].id === postVerification[0].autor_id)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' })
    }

    if (isNaN(parseInt(categoryId))) {
      return res.status(400).json({ message: 'Wrong category id.' })
    }

    // Ingresar los datos a la db
    const [result] = await pool.execute('INSERT INTO categories_posts (post_id, category_id) VALUES (?, ?);', [id, categoryId])

    // Validar el id del registro insertado
    if (!result.insertId) {
      return res.status(500).json({ message: 'Error inserting category.' })
    }

    // Traer el post insertado
    const [post] = await pool.execute(`
    SELECT p.id, p.title, p.content, u.username AS autor, p.create_date
    FROM posts p
    LEFT JOIN users u ON p.autor_id = u.id  WHERE p.id = ?;
    `, [id])

    const [categories] = await pool.execute(`
    SELECT cp.id AS category_post_id ,c.id AS category_id, c.category_name
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
    res.status(201).json({ message: 'Category inserted.', post })
  } catch (error) {
    let message = 'Internal Error'
    let statusCode = 500

    // Validar si el error es por un categoria no valida. Si es así, cambiar el mensaje y código de error.
    if (error?.errno === 1452) {
      message = 'Wrong category id'
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

export const updatePost = async (req, res) => {
  try {
    // Extraer los datos enviados
    const { post_id: id } = req.params
    const { title, content, userEmail, userPassword } = req.body

    // Validamos el id
    if (isNaN(parseInt(id))) {
      return res.status(404).json({ message: 'Post not found' })
    }

    // Validación de los datos y credenciales
    const [user] = await pool.execute('SELECT * FROM users WHERE email = ? AND password = ?', [userEmail, userPassword])
    console.log(user)

    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const [row] = await pool.execute('SELECT * FROM posts WHERE id = ?', [id])

    if (!(user[0].role_id === 2 || user[0].id === row[0].autor_id)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' })
    }

    // Actualizamos los datos a la db
    const [result] = await pool.execute('UPDATE posts SET title = IFNULL(?, title), content = IFNULL(?, content) WHERE id = ?', [title, content, id])

    if (result.affectedRows <= 0) {
      return res.status(500).json({ message: 'Error updating post data.' })
    }

    // Traer el post insertado
    const [post] = await pool.execute(`
    SELECT p.id, p.title, p.content, u.username AS autor, p.create_date
    FROM posts p
    LEFT JOIN users u ON p.autor_id = u.id  WHERE p.id = ?;
    `, [id])

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
    res.status(201).json({ message: 'Post updated.', post })
  } catch (error) {
    let message = 'Internal Error'
    let statusCode = 500

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

export const updatePostCategory = async (req, res) => {
  try {
    // Extraer los datos enviados desde POST
    const { category_post_id: id } = req.params
    const { post_id: postId, category_id: categoryId, userEmail, userPassword } = req.body

    // Validamos el id
    if (isNaN(parseInt(id))) {
      return res.status(404).json({ message: 'Post category not found' })
    }

    // Validación de los datos
    if ((isNaN(parseInt(postId))) || (isNaN(parseInt(categoryId)))) {
      return res.status(400).json({ message: 'missing data.' })
    }

    // Validación de los datos y credenciales
    const [user] = await pool.execute('SELECT * FROM users WHERE email = ? AND password = ?', [userEmail, userPassword])

    const [postVerification] = await pool.execute('SELECT * FROM posts WHERE id = ?', [postId])

    if (isNaN(parseInt(postId)) || postVerification.length === 0) {
      return res.status(400).json({ message: 'Wrong post id.' })
    }

    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (!(user[0].role_id === 2 || user[0].id === postVerification[0].autor_id)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' })
    }

    const [categoryVerification] = await pool.execute('SELECT * FROM categories WHERE id = ?', [categoryId])

    if (isNaN(parseInt(categoryId)) || categoryVerification.length === 0) {
      return res.status(400).json({ message: 'Wrong category id.' })
    }

    // Ingresar los datos a la db
    const [result] = await pool.execute('UPDATE categories_posts SET post_id = IFNULL(?, post_id), category_id = IFNULL(?, category_id) WHERE id = ?;', [postId, categoryId, id])

    // Validar el id del registro insertado
    if (!result.affectedRows) {
      return res.status(500).json({ message: 'Error updating post category.' })
    }

    // Traer el post insertado
    const [post] = await pool.execute(`
    SELECT p.id, p.title, p.content, u.username AS autor, p.create_date
    FROM posts p
    LEFT JOIN users u ON p.autor_id = u.id  WHERE p.id = ?;
    `, [postId])

    const [categories] = await pool.execute(`
    SELECT c.id AS category_id, c.category_name
    FROM posts p 
    INNER JOIN categories_posts cp ON p.id = cp.post_id 
    INNER JOIN categories c ON c.id = cp.category_id WHERE p.id = ?;
    `, [postId])

    const [comments] = await pool.execute(`
    SELECT c.id AS comment_id, c.content, p.id AS post_id, u.id AS user_id, u.username, p.create_date 
    FROM posts p 
    INNER JOIN comments c ON p.id = c.post_id 
    INNER JOIN users u ON u.id = c.user_id WHERE p.id = ?;
    `, [postId])

    post[0].categories = categories

    post[0].comments = comments

    // Mensaje al cliente
    res.status(201).json({ message: 'Post category updated.', post })
  } catch (error) {
    let message = 'Internal Error'
    let statusCode = 500

    // Validar si el error es por un categoria no valida. Si es así, cambiar el mensaje y código de error.
    if (error?.errno === 1452) {
      message = 'Wrong category_id or post_id'
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

export const deletePost = async (req, res) => {
  try {
    const { post_id: id } = req.params
    const { userEmail, userPassword } = req.body

    const [user] = await pool.execute('SELECT * FROM users WHERE email = ? AND password = ?', [userEmail, userPassword])

    const [post] = await pool.execute('SELECT * FROM posts WHERE id = ?', [id])

    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (!(user[0].role_id === 2 || user[0].id === post[0].autor_id)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' })
    }

    // Validamos el id
    if (isNaN(parseInt(id))) {
      return res.status(404).json({ message: 'Post not found' })
    }

    await pool.execute('DELETE FROM comments WHERE post_id = ?', [id])
    await pool.execute('DELETE FROM categories_posts WHERE post_id = ?', [id])
    const [result] = await pool.execute('DELETE FROM posts WHERE id = ?', [id])
    if (result.affectedRows <= 0) {
      return res.status(500).json({ message: 'Error al eliminar el post de la db.' })
    }

    res.sendStatus(204)
  } catch (error) {
    return res.status(500).json({ message: 'Someting goes wrong' })
  }
}

export const deletePostCategory = async (req, res) => {
  try {
    const { category_post_id: id } = req.params
    const { userEmail, userPassword } = req.body

    const [user] = await pool.execute('SELECT * FROM users WHERE email = ? AND password = ?', [userEmail, userPassword])

    const [postCategory] = await pool.execute('SELECT * FROM categories_posts WHERE id = ?', [id])

    const [post] = await pool.execute('SELECT * FROM posts WHERE id = ?', [postCategory[0].post_id])

    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (!(user[0].role_id === 2 || user[0].id === post[0].autor_id)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' })
    }

    // Validamos el id
    if (isNaN(parseInt(id))) {
      return res.status(404).json({ message: 'Post Category not found' })
    }

    const [result] = await pool.query('DELETE FROM categories_posts WHERE id = ?', [id])
    if (result.affectedRows <= 0) {
      return res.status(500).json({ message: 'Error al eliminar la categoria del post de la db.' })
    }

    res.sendStatus(204)
  } catch (error) {
    return res.status(500).json({ message: 'Someting goes wrong' })
  }
}

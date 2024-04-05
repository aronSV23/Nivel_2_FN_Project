import { Router } from 'express'
import { addCategoryToPost, createPost, deletePost, deletePostCategory, getPostByCategory, getPostById, getPostByTitle, getPosts, updatePost, updatePostCategory } from '../controllers/posts.controller.js'

const router = Router()

router.get('/', getPosts)

router.get('/:id', getPostById)

router.get('/category/:category_id', getPostByCategory)

router.get('/title/:search', getPostByTitle)

router.post('/', createPost)

router.post('/category/:post_id', addCategoryToPost)

router.patch('/:post_id', updatePost)

router.patch('/category/:category_post_id', updatePostCategory)

router.delete('/:post_id', deletePost)

router.delete('/category/:category_post_id', deletePostCategory)

export default router

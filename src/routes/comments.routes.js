import { Router } from 'express'
import { addPostComments, deletePostComments, getPostComments, updatePostComments } from '../controllers/comments.controller.js'

const router = Router()

router.get('/:post_id', getPostComments)

router.post('/:post_id', addPostComments)

router.patch('/:comment_id', updatePostComments)

router.delete('/:comment_id', deletePostComments)

export default router

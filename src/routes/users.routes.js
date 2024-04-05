import { Router } from 'express'
import { handleError, uploadImage } from '../config/multer.js'
import { createUser, deleteUser, getUser, getUserImageProfile, getUsers, updateUser } from '../controllers/users.controller.js'

const router = Router()

router.get('/', getUsers)

router.get('/:id', getUser)

router.get('/image/:filename', getUserImageProfile)

router.post('/', uploadImage.single('profilePicture'), handleError, createUser)

router.patch('/:id', uploadImage.single('profilePicture'), handleError, updateUser)

router.delete('/:id', deleteUser)

export default router

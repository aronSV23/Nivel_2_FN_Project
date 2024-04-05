import { Router } from 'express'
import { createCategory, deleteCategory, getCategories, updateCategory } from '../controllers/categories.controller.js'

const router = Router()

router.get('/', getCategories)

router.post('/', createCategory)

router.patch('/:category_id', updateCategory)

router.delete('/:category_id', deleteCategory)

export default router

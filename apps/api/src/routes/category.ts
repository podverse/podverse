import { config } from '@api/config/index.js';
import { CategoryController } from '@api/controllers/category.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/category`, router);

router.get('/:id', asyncHandler(CategoryController.get));
router.get('/', asyncHandler(CategoryController.getAll));

export const categoryRouter = router;

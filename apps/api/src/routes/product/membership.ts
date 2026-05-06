import { MembershipController } from '@api/controllers/membership.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

export const membershipRouter = Router();

membershipRouter.get('/pricing', asyncHandler(MembershipController.getPricing));
membershipRouter.get('/billing-read-model', asyncHandler(MembershipController.getBillingReadModel));
membershipRouter.get('/', asyncHandler(MembershipController.getResolvedProductMembership));

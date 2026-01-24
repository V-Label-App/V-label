/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error type or name
 *           example: "Validation Error"
 *         message:
 *           type: string
 *           description: Human-readable error message
 *           example: "Invalid input data"
 *         details:
 *           type: array
 *           description: Additional error details (optional)
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 example: "email"
 *               message:
 *                 type: string
 *                 example: "Invalid email format"
 *
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Operation completed successfully"
 *         data:
 *           type: object
 *           description: Response data (varies by endpoint)
 *
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           description: Current page number
 *           example: 1
 *         limit:
 *           type: integer
 *           description: Number of items per page
 *           example: 20
 *         total:
 *           type: integer
 *           description: Total number of items
 *           example: 100
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 *           example: 5
 */

export { };

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { swaggerConfig } from '../config/swagger.config.js';
import { logger } from '../utils/logger.js';

export function setupSwagger(app: Express): void {
    // Check if Swagger should be enabled
    const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true';

    if (!swaggerEnabled) {
        logger.info('SWAGGER', 'Swagger UI is disabled');
        return;
    }

    try {
        // Generate Swagger specification
        const swaggerSpec = swaggerJsdoc(swaggerConfig);

        // Swagger UI options
        const swaggerUiOptions = {
            explorer: true,
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'V-Label API Documentation',
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                tryItOutEnabled: true,
            },
        };

        // Serve Swagger JSON
        app.get('/api-docs.json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.send(swaggerSpec);
        });

        // Serve Swagger UI
        app.use(
            '/api-docs',
            swaggerUi.serve,
            swaggerUi.setup(swaggerSpec, swaggerUiOptions)
        );

        logger.info('SWAGGER', 'Swagger UI is available at http://localhost:4000/api-docs');
        logger.info('SWAGGER', 'Swagger JSON is available at http://localhost:4000/api-docs.json');
    } catch (error) {
        logger.error('SWAGGER', 'Failed to setup Swagger', error);
    }
}

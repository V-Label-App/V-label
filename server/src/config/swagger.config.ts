import { Options } from 'swagger-jsdoc';

export const swaggerConfig: Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'V-Label API Documentation',
            version: '1.0.0',
            description: 'Comprehensive API documentation for V-Label annotation platform',
            contact: {
                name: 'V-Label Team',
                email: 'support@vlabel.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: 'http://localhost:4000',
                description: 'Development server',
            },
            {
                url: 'https://production.vlabel.com',
                description: 'Production server',
            },
            {
                url: 'https://api.vlabel.com',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token in the format: Bearer <token>',
                },
            },
            responses: {
                UnauthorizedError: {
                    description: 'Access token is missing or invalid',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'string',
                                        example: 'Unauthorized',
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Invalid or expired token',
                                    },
                                },
                            },
                        },
                    },
                },
                ForbiddenError: {
                    description: 'User does not have permission to access this resource',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'string',
                                        example: 'Forbidden',
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Insufficient permissions',
                                    },
                                },
                            },
                        },
                    },
                },
                NotFoundError: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'string',
                                        example: 'Not Found',
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Resource not found',
                                    },
                                },
                            },
                        },
                    },
                },
                ValidationError: {
                    description: 'Validation error',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'string',
                                        example: 'Validation Error',
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Invalid input data',
                                    },
                                    details: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                field: { type: 'string' },
                                                message: { type: 'string' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                ServerError: {
                    description: 'Internal server error',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'string',
                                        example: 'Internal Server Error',
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'An unexpected error occurred',
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and authorization endpoints',
            },
            {
                name: 'Users',
                description: 'User management endpoints',
            },
            {
                name: 'Projects',
                description: 'Project management endpoints',
            },
            {
                name: 'Labels',
                description: 'Label management endpoints',
            },
            {
                name: 'Label Categories',
                description: 'Label category management endpoints',
            },
            {
                name: 'Project Labels',
                description: 'Project-specific label configuration endpoints',
            },
            {
                name: 'Tasks',
                description: 'Task management and assignment endpoints',
            },
            {
                name: 'Annotations',
                description: 'Annotation data endpoints',
            },
            {
                name: 'Admin',
                description: 'Administrative endpoints (admin only)',
            },
            {
                name: 'Notifications',
                description: 'Notification management endpoints',
            },
            {
                name: 'AI',
                description: 'AI-powered features and chat endpoints',
            },
        ],
    },
    apis: [
        './src/controllers/*.ts',
        './src/routes/*.ts',
        './src/docs/schemas/*.ts',
    ],
};

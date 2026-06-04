const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'B2C Store API',
      version: '1.0.0',
      description:
        'RESTful API for a B2C e-commerce store. Iteration 1 — full backend including auth, products, categories, cart, orders, and admin endpoints.',
      contact: { name: 'Store Team' },
    },
    servers: [
      { url: '/api', description: 'Default server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Obtain a token via POST /api/auth/login, then prefix it with "Bearer "',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };

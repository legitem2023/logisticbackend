import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolver.js';
import dotenv from 'dotenv';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import bodyParser from 'body-parser';
import compression from 'compression';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cookieParser from 'cookie-parser'; // Import cookie-parser
dotenv.config();
async function init() {
    const app = express();
    const Port = process.env.PORT || 4000;
    const URL = process.env.URL;
    const httpsServer = http.createServer(app);
    // Create the schema
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const server = new ApolloServer({
        schema,
        plugins: [ApolloServerPluginDrainHttpServer({ httpServer: httpsServer })],
    });
    await server.start();
    // Subscription Server setup
    const subscriptionServer = SubscriptionServer.create({
        schema,
        execute,
        subscribe,
        onConnect: (connectionParams, webSocket, context) => {
            // WebSocket connected
        },
        onDisconnect: (webSocket, context) => {
            // WebSocket disconnected
        },
    }, {
        server: httpsServer,
        path: '/graphql',
    });
    // CORS Middleware - Applied first
    app.use(cors({
        origin: function (origin, callback) {
            const allowedOrigins = [
                'https://management-pi.vercel.app',
                'https://client-legitem.vercel.app',
                'http://localhost:3000',
                'http://localhost:4000',
                'http://localhost:3001',
            ];
            // Check if the request origin is allowed
            if (allowedOrigins.includes(origin) || !origin) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true, // Required if you're sending cookies or authorization headers
    }));
    // Middleware setup
    app.use(bodyParser.json({ limit: '500mb' }));
    app.use(bodyParser.urlencoded({ limit: '500mb', extended: false }));
    app.use(compression());
    app.use(graphqlUploadExpress());
    app.use(cookieParser());
    // Apollo middleware with context
    app.use('/graphql', expressMiddleware(server, {
        context: async ({ req }) => ({
            token: req.headers.token,
            cookies: req.cookies,
        }),
    }));
    // Static file serving
    app.use(express.static('json'));
    app.use(express.static('model'));
    app.use(express.static('model/category_images'));
    // Start the server
    await new Promise((resolve) => httpsServer.listen(Port, resolve));
    console.log(`🚀 Server ready at ${URL}:${Port}/graphql`);
}
init();

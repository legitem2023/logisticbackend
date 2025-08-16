import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import bodyParser from 'body-parser';
import compression from 'compression';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';
import cookieParser from 'cookie-parser';
import playground from 'graphql-playground-middleware-express';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolver.js';
import { CronJob } from 'cron';
import { reassignStaleDeliveries } from './script/reassignStaleDeliveries.js';
import { markInactiveUsers } from './script/markInactiveUsers.js';
dotenv.config();
async function init() {
    const app = express();
    const Port = process.env.PORT || 4000;
    const URL = process.env.URL || 'http://localhost';
    const httpServer = http.createServer(app);
    // ✅ Create GraphQL schema
    const schema = makeExecutableSchema({
        typeDefs,
        resolvers,
    });
    // ✅ Apollo Server v4 setup
    const server = new ApolloServer({
        schema,
        plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    });
    await server.start();
    // ✅ WebSocket subscriptions
    SubscriptionServer.create({
        schema,
        execute,
        subscribe,
        onConnect: (connectionParams) => {
            console.log('🔌 WebSocket connected');
        },
        onDisconnect: () => {
            console.log('❌ WebSocket disconnected');
        },
    }, {
        server: httpServer,
        path: '/graphql',
    });
    // ✅ Express middlewares
    app.use(cors({
        origin: function (origin, callback) {
            const allowedOrigins = [
                'https://management-pi.vercel.app',
                'https://client-legitem.vercel.app',
                'http://localhost:3000',
                'http://localhost:4000',
                'http://localhost:3001',
                'https://logisticfrontend.vercel.app',
                'https://logisticfrontend.onrender.com'
            ];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    }));
    app.use(bodyParser.json({ limit: '500mb' }));
    app.use(bodyParser.urlencoded({ limit: '500mb', extended: false }));
    app.use(compression());
    app.use(graphqlUploadExpress());
    app.use(cookieParser());
    app.get('/playground', playground.default({ endpoint: '/graphql' }));
    //Add this before starting your Apollo Server
    const reassignmentJob = new CronJob('*/5 * * * *', // Every 5 minutes
    async () => {
        console.log('Running stale delivery reassignment...');
        await reassignStaleDeliveries();
    }, null, // onComplete
    true, // start immediately
    'UTC' // timezone
    );
    markInactiveUsers.start();
    // ✅ Apollo middleware (🔧 TS-safe fix here)
    app.use('/graphql', await expressMiddleware(server, {
        context: async ({ req }) => ({
            token: req.headers.token,
            cookies: req.cookies,
        }),
    }));
    // ✅ Static files
    app.use(express.static('json'));
    app.use(express.static('model'));
    app.use(express.static('model/category_images'));
    app.use(express.static('public/uploads'));
    app.use('/docs', express.static('docs'));
    // app.use('/graph-voyager', voyagerMiddleware({ endpointUrl: '/graphql' }));
    // ✅ Start server
    await new Promise((resolve) => httpServer.listen(Port, resolve));
    console.log(`🚀 Server ready at ${URL}:${Port}/graphql`);
    console.log(`🧪 Playground available at ${URL}:${Port}/playground`);
}
init().catch((err) => {
    console.error('❌ Server failed to start:', err);
});

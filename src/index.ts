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

import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolver.js';

dotenv.config();

type MyContext = {
  token?: string;
  cookies?: any;
};

async function init() {
  const app = express();
  const Port = process.env.PORT || 4000;
  const URL = process.env.URL || 'http://localhost';
  const httpServer = http.createServer(app);

  // Create schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Apollo server setup
  const server = new ApolloServer<MyContext>({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  // Subscription Server setup
  SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect: (connectionParams: any) => {
        console.log('🔌 WebSocket connected');
      },
      onDisconnect: () => {
        console.log('❌ WebSocket disconnected');
      },
    },
    {
      server: httpServer,
      path: '/graphql',
    }
  );

  // Express middlewares
  app.use(
    cors({
      origin: function (origin: any, callback: any) {
        const allowedOrigins = [
          'https://management-pi.vercel.app',
          'https://client-legitem.vercel.app',
          'http://localhost:3000',
          'http://localhost:4000',
          'http://localhost:3001',
        ];
        if (allowedOrigins.includes(origin) || !origin) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  app.use(bodyParser.json({ limit: '500mb' }));
  app.use(bodyParser.urlencoded({ limit: '500mb', extended: false }));
  app.use(compression());
  app.use(graphqlUploadExpress());
  app.use(cookieParser());

  // Apollo GraphQL middleware
// To this:
app.use(
  '/graphql',
  expressMiddleware(server, {  // ✅ Correct
    context: async ({ req }) => ({
      token: req.headers.token as string,
      cookies: req.cookies,
    }),
  })
);
  

  // Serve static files
  app.use(express.static('json'));
  app.use(express.static('model'));
  app.use(express.static('model/category_images'));

  // Start server
  await new Promise<void>((resolve) => httpServer.listen(Port, resolve));
  console.log(`🚀 Server ready at ${URL}:${Port}/graphql`);
}

init().catch((err) => {
  console.error('❌ Server failed to start:', err);
});

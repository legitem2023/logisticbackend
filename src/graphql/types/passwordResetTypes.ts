// src/graphql/types/passwordResetTypes.ts
import { gql } from 'apollo-server-express';

export const passwordResetTypeDefs = gql`
  type PasswordResetResult {
    success: Boolean!
    message: String!
    token: String
  }

  type TokenValidationResult {
    valid: Boolean!
    email: String
    message: String!
  }

  type PasswordResetStats {
    activeTokens: Int!
  }

  input RequestPasswordResetInput {
    email: String!
  }

  input ResetPasswordInput {
    token: String!
    newPassword: String!
  }

  input ValidateResetTokenInput {
    token: String!
  }

  type Mutation {
    requestPasswordReset(input: RequestPasswordResetInput!): PasswordResetResult!
    resetPassword(input: ResetPasswordInput!): PasswordResetResult!
    validateResetToken(input: ValidateResetTokenInput!): TokenValidationResult!
  }

  type Query {
    passwordResetStats: PasswordResetStats!
  }
`;

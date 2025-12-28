
import { gql } from 'graphql-tag';


export const typeDefs = gql`
scalar Upload


type VehicleType {
  id: String
  name: String
  maxCapacityKg: Float
  maxVolumeM3: Float
  description: String
  createdAt: String
  updatedAt: String
  icon: String
  cost: Float
  perKmRate: Float
  rushTimeAddon: Float
}

# User / Rider
type User {
  id: String
  image: String
  name: String
  email: String
  phoneNumber: String
  address: String
  vehicleTypeId: String
  vehicleType: VehicleType
  licensePlate: String
  status: String
  currentLatitude: Float
  currentLongitude: Float
  lastUpdatedAt: String
  createdAt: String
  updatedAt: String
  role: String
  license: String
}

# Location Tracking
type LocationTracking {
  id: String!
  user: User!
  latitude: Float!
  longitude: Float!
  speed: Float
  heading: Float
  accuracy: Float
  batteryLevel: Float
  timestamp: String!
}

# Delivery
type Delivery {
  id: String
  trackingNumber: String
  sender: User
  recipientName: String
  recipientPhone: String
  pickupAddress: String
  pickupLatitude: Float
  pickupLongitude: Float
  dropoffAddress: String
  dropoffLatitude: Float
  dropoffLongitude: Float
  assignedRider: User
  deliveryStatus: String
  estimatedDeliveryTime: String
  eta: String
  actualDeliveryTime: String
  ata: String
  createdAt: String
  updatedAt: String
  deliveryType:String
  paymentStatus:   String
  paymentMethod:  String
  deliveryFee: Float
  isCancelled:      Boolean
  cancellationReason: String
  failedAttemptReason: String
  currentLatitude:   Float
  currentLongitude:  Float
  senderId: String
  assignedRiderId: String
  packageId: String
  packages:[Package]
  proofOfDelivery: [ProofOfDelivery]
  proofOfPickup: [ProofOfPickup]
  baseRate: Float
  perKmRate: Float
  distance: Float
  paymentCode: String
}

# Delivery Status Log
type DeliveryStatusLog {
  id: String
  delivery: Delivery
  status: String
  updatedBy: User
  remarks: String
  timestamp: String
}

# Proof of Delivery
type ProofOfDelivery {
  id: String!
  delivery: Delivery!
  photoUrl: String
  signatureData: String
  receivedBy: String!
  receivedAt: String!
}

type ProofOfPickup {
  id: String
  delivery: Delivery
  pickupDateTime: String
  pickupAddress: String
  pickupLatitude: Float
  pickupLongitude: Float
  pickupBy: User
  customerName: String
  customerSignature: String
  proofPhotoUrl: String
  packageCondition: String
  numberOfPackages: Int
  otpCode: String
  remarks: String
  status:  String   #picked_up, failed, pending
  createdAt: String
  updatedAt: String
}



# Route History
type RouteHistory {
  id: String
  rider: User
  riderId: String
  delivery: Delivery
  latitude: Float
  longitude: Float
  recordedAt: String
}

# Package
type Package {
  id: String
  delivery: Delivery
  packageType: String
  weight: Float
  dimensions: String
  specialInstructions: String
}

# Notification
type Notification {
  id: String
  user: User
  userId: String
  title: String
  message: String
  type: String
  isRead: Boolean
  createdAt: String
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
  CANCELLED
}

enum PaymentMethod {
  CASH
  CREDIT_CARD
  DEBIT_CARD
  GCASH
  PAYMAYA
  BANK_TRANSFER
  WALLET
}

type Transaction {
  id: String!
  walletId: String
  wallet: Wallet
  deliveryId: String
  delivery: Delivery
  type: String!
  amount: Float!
  description: String!
  status: TransactionStatus!
  referenceId: String
  paymentMethod: PaymentMethod
  createdAt: String!
}

type Wallet {
  id: String!
  user: User!
  balance: Float!
  currency: String!
  transactions: [Transaction]!
  createdAt: String!
  updatedAt: String!
}

type GCashPaymentResponse {
  paymentId: String!
  gcashPaymentId: String!
  qrCodeUrl: String
  checkoutUrl: String!
  status: TransactionStatus!
  referenceId: String!
}

input InitiateGCashPaymentInput {
  deliveryId: String!
  amount: Float!
  description: String
}

input VerifyGCashPaymentInput {
  paymentId: String!
}

input ProcessGCashWebhookInput {
  paymentId: String!
  referenceId: String!
  status: TransactionStatus!
}

type AuthStatus {
  authenticated: Boolean!
  user: User
}

type PasswordReset {
  id: String
  userId: String
  userEmail: String
  token: String
  expiresAt: String
  used: Boolean
  createdAt: String
  user: User
}

type Query {
  passwordResetStats: PasswordResetStats!
  getAllPasswordResets: [PasswordReset]
  authStatus: AuthStatus!
  getUsers: [User]
  getUser(id: String): User
  getDeliveries: [Delivery]
  getDelivery(id:String): Delivery
  getDispatch(id:String): [Delivery]
  getRidersDelivery(id: String): [Delivery]
  getVehicleTypes: [VehicleType]
  getRiders: [User]
  getNotifications(id:String): [Notification]
  getTransaction(paymentId: String!): Transaction
  getWallet(userId: String!): Wallet
  getTransactionsByUser(userId: String!): [Transaction]!
}

type Result {
  statusText: String
  token: String
}

input CreateDeliveryInput {
  senderId: String
  recipientName: String
  recipientPhone: String
  pickupAddress: String
  pickupLatitude: Float
  pickupLongitude: Float
  dropoffAddress: String
  dropoffLatitude: Float
  dropoffLongitude: Float
  assignedRiderId: String
  estimatedDeliveryTime: String
  eta: String
  deliveryType: String
  paymentStatus: String
  paymentMethod: String
  deliveryFee: Float
  baseRate: Float
  perKmRate: Float
  distance: Float
}
input CreateRiderInput {
  name: String
  email: String
  phoneNumber: String
  vehicleTypeId: String
  licensePlate: String
  password: String
  photo: String
  license: String
}

input EditRiderInput {
  id: String
  name: String
  email: String
  phoneNumber: String
  vehicleTypeId: String
  licensePlate: String
  role: String
}

input CreateSenderInput {
  name: String
  email: String
  phoneNumber: String
  password: String
  address: String
}

input LoginInput {
  email: String
  password: String
}

input GoogleLoginInput {
  idToken: String!
}


type LocationTrackingData {
  userID: String
  latitude: Float
  longitude: Float
  speed: Float
  heading: Float
  accuracy: Float
  batteryLevel: Float
  timestamp: String
}

input LocationTrackingInput {
  userID: String
  latitude: Float
  longitude: Float
  speed: Float
  heading: Float
  accuracy: Float
  batteryLevel: Float
  timestamp: String
}

type FileResponse {
    filename: String
    mimetype: String
    encoding: String
    url: String
}

input ProofOfDeliveryInput {
  id: String!
  receivedBy: String!
  receivedAt: String!
  photoUrl: String!
  signatureData: String!
}

input ProofOfPickupInput {
  id: String
  riderId: String
  pickupDateTime: String
  pickupAddress: String
  pickupLatitude: Float
  pickupLongitude: Float
  customerName: String
  customerSignature: String
  proofPhotoUrl: String
  packageCondition: String
  numberOfPackages: Int
  otpCode: String
  remarks: String
  status: String
}

type LogoutResponse {
  success: Boolean!
  message: String!
}







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


type ContactFormData {
  name: String!
  email: String!
  phone: String
  company: String
  service: String!
  message: String!
}

type ContactFormResponse {
  success: Boolean!
  message: String!
  referenceNumber: String
  emailSent: Boolean
  timestamp: String
}

input ContactFormInput {
  name: String!
  email: String!
  phone: String
  company: String
  service: String!
  message: String!
}





type Mutation {
  submitLogisticsContactForm(formData: ContactFormInput!): ContactFormResponse!
  editpassword(email:String,password:String):Result
  requestPasswordReset(input: RequestPasswordResetInput!):Result
  resetPassword(input: ResetPasswordInput!): Result
  validateResetToken(input: ValidateResetTokenInput!): TokenValidationResult!
  
    
  logout: LogoutResponse!
  logoutAllDevices: LogoutResponse!
  insertPickupProof(input:ProofOfPickupInput):Result
  # GCash Payments
  initiateGCashPayment(input: InitiateGCashPaymentInput!): GCashPaymentResponse!
  verifyGCashPayment(input: VerifyGCashPaymentInput!): Transaction!
  processGCashWebhook(input: ProcessGCashWebhookInput!): Boolean!
  
  # Wallet Operations
  createWallet(userId: String!): Wallet!
  topUpWallet(walletId: String!, amount: Float!, method: PaymentMethod!): Transaction!
  transferWalletToWallet(
    senderWalletId: String!, 
    receiverWalletId: String!, 
    amount: Float!,
    pin: String!
  ): Transaction!
  
  # Delivery Payment Updates
  markDeliveryAsPaid(deliveryId: String!, method: PaymentMethod!): Delivery!
  refundDeliveryPayment(deliveryId: String!): Transaction!


  uploadFile(file: ProofOfDeliveryInput!): Result
  assignRider(deliveryId: String!, riderId: String!): Result
  createDelivery(input: CreateDeliveryInput):Result
  createSender(input: CreateSenderInput): Result
  createRider(input: CreateRiderInput): Result
  editRider(input:EditRiderInput):Result
  login(input: LoginInput): Result
  loginWithGoogle(input: GoogleLoginInput): Result
  loginWithFacebook(input: GoogleLoginInput): Result
  locationTracking(input: LocationTrackingInput): LocationTrackingData
  sendNotification(userID: String, title: String, message: String, type: String): Notification
  acceptDelivery(deliveryId: String!, riderId: String!): Result
  skipDelivery(deliveryId: String!, riderId: String!): Result
  finishDelivery(deliveryId: String!, riderId: String!): Result
  cancelDelivery(deliveryId: String!, riderId: String!): Result
  createRouteHistory(deliveryId: String!, riderId: String!,latitude:Float,longitude:Float):Result
  createPackage(deliveryId: String!,packageType:String,weight:Float,dimensions:String,specialInstructions:String):Result
  readNotification(notificationId: String!): Result
  deleteNotification(notificationId: String!): Result
  markPaid(deliveryId: String!, riderId: String!, code: String): Result
}

type Subscription {
    LocationTracking(userID: String): LocationTrackingData
    notificationReceived(userID: String): Notification
}
`

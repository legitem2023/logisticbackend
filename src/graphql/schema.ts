
import { gql } from 'graphql-tag';


export const typeDefs = gql`

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
}

# User / Rider
type User {
  id: String
  image: String
  name: String
  email: String
  phoneNumber: String
  vehicleType: VehicleType
  licensePlate: String
  status: String
  currentLatitude: Float
  currentLongitude: Float
  lastUpdatedAt: String
  createdAt: String
  updatedAt: String
  role: String
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
  actualDeliveryTime: String
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
  package:Package
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

type Query {
  getUsers: [User]
  getUser(id: Int): User
  getDeliveries: [Delivery]
  getDelivery(id:String): Delivery
  getDispatch(id:String): [Delivery]
  getRidersDelivery(id: String): [Delivery]
  getVehicleTypes: [VehicleType]
  getRiders: [User]
  getNotifications(id:String): [Notification]
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
  deliveryType: String
  paymentStatus: String
  paymentMethod: String
  deliveryFee: Float

}
input CreateRiderInput {
  name: String
  email: String
  phoneNumber: String
  vehicleTypeId: String
  licensePlate: String
  password: String
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


type Mutation {
  createDelivery(input: CreateDeliveryInput):Result
  createRider(input: CreateRiderInput): Result
  login(input: LoginInput): Result
  loginWithGoogle(input: GoogleLoginInput): Result
  loginWithFacebook(input: GoogleLoginInput): Result
  locationTracking(input: LocationTrackingInput): LocationTrackingData
  sendNotification(userID: String, title: String, message: String, type: String): Notification
  acceptDelivery(deliveryId: String!, riderId: String!): Result
  finishDelivery(deliveryId: String!, riderId: String!): Result
  cancelDelivery(deliveryId: String!, riderId: String!): Result
  createRouteHistory(deliveryId: String!, riderId: String!,latitude:Float,longitude:Float):Result
  createPackage(deliveryId: String!,packageType:String,weight:Float,dimensions:String,specialInstructions:String):Result
}

type Subscription {
    LocationTracking(userID: String): LocationTrackingData
    notificationReceived(userID: String): Notification
}
`

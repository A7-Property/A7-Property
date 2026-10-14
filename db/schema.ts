import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  accountType: text("account_type", { enum: ["seeker", "lister"] }).notNull().default("seeker"),
  isAgent: integer("is_agent", { mode: "boolean" }).notNull().default(false),
  phoneVerified: integer("phone_verified", { mode: "boolean" }).notNull().default(false),
  idVerified: integer("id_verified", { mode: "boolean" }).notNull().default(false),
  preferredLanguage: text("preferred_language", { enum: ["en", "my"] }).notNull().default("en"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  lastActiveAt: integer("last_active_at", { mode: "timestamp" }),
});

export const seekerProfiles = sqliteTable("seeker_profiles", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  budgetMin: integer("budget_min"),
  budgetMax: integer("budget_max"),
  preferredTownships: text("preferred_townships"),
  preferredPropertyTypes: text("preferred_property_types"),
  preferredPurpose: text("preferred_purpose", { enum: ["rent", "sale", "any"] }).default("any"),
  bedroomPreference: integer("bedroom_preference"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const listerProfiles = sqliteTable("lister_profiles", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  agencyName: text("agency_name"),
  licenseNumber: text("license_number"),
  bio: text("bio"),
  responseTimeMinutes: integer("response_time_minutes").default(60),
  verificationStatus: text("verification_status", { enum: ["unverified", "pending", "verified"] }).notNull().default("unverified"),
  rating: real("rating").default(0),
  totalRatings: integer("total_ratings").default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const properties = sqliteTable("properties", {
  id: text("id").primaryKey(),
  listerId: text("lister_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  propertyType: text("property_type", { enum: ["condo", "apartment", "house", "mini_condo", "villa"] }).notNull(),
  purpose: text("purpose", { enum: ["rent", "sale"] }).notNull(),
  city: text("city").notNull(),
  township: text("township").notNull(),
  address: text("address"),
  price: integer("price").notNull(),
  currency: text("currency").notNull().default("MMK"),
  bedrooms: integer("bedrooms").notNull().default(1),
  bathrooms: integer("bathrooms").notNull().default(1),
  areaSqft: integer("area_sqft").notNull(),
  floor: integer("floor"),
  yearBuilt: integer("year_built"),
  furniture: text("furniture", { enum: ["unfurnished", "partly_furnished", "fully_furnished"] }).default("unfurnished"),
  amenities: text("amenities"),
  images: text("images"),
  lat: real("lat"),
  lng: real("lng"),
  verificationStatus: text("verification_status", { enum: ["pending", "verified", "rejected"] }).notNull().default("pending"),
  status: text("status", { enum: ["draft", "active", "paused", "rented", "sold"] }).notNull().default("draft"),
  viewsCount: integer("views_count").notNull().default(0),
  savesCount: integer("saves_count").notNull().default(0),
  inquiriesCount: integer("inquiries_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
});

export const inquiries = sqliteTable("inquiries", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  seekerId: text("seeker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listerId: text("lister_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["message", "viewing_request"] }).notNull().default("message"),
  message: text("message").notNull(),
  preferredDate: text("preferred_date"),
  preferredTime: text("preferred_time"),
  status: text("status", { enum: ["pending", "responded", "confirmed", "declined", "closed"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  inquiryId: text("inquiry_id").notNull().references(() => inquiries.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const savedHomes = sqliteTable("saved_homes", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const savedSearches = sqliteTable("saved_searches", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  filters: text("filters").notNull(),
  alertEnabled: integer("alert_enabled", { mode: "boolean" }).notNull().default(false),
  lastNotifiedAt: integer("last_notified_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["new_match", "price_change", "message", "inquiry", "verification_update"] }).notNull(),
  payload: text("payload"),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});
/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_assignments from "../admin_assignments.js";
import type * as attendance from "../attendance.js";
import type * as auth from "../auth.js";
import type * as cds_groups from "../cds_groups.js";
import type * as dashboard from "../dashboard.js";
import type * as email from "../email.js";
import type * as onboarding from "../onboarding.js";
import type * as qr from "../qr.js";
import type * as reports from "../reports.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin_assignments: typeof admin_assignments;
  attendance: typeof attendance;
  auth: typeof auth;
  cds_groups: typeof cds_groups;
  dashboard: typeof dashboard;
  email: typeof email;
  onboarding: typeof onboarding;
  qr: typeof qr;
  reports: typeof reports;
  seed: typeof seed;
  users: typeof users;
  utils: typeof utils;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};

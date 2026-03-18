import { apiClient } from "./client";
import type {
  BillingPortalResponse,
  CheckoutSessionResponse,
  SubscriptionResponse,
} from "@/types/api";

export async function getSubscription(): Promise<SubscriptionResponse> {
  return apiClient.get<SubscriptionResponse>("/billing/subscription");
}

export async function createCheckoutSession(
  plan: string
): Promise<CheckoutSessionResponse> {
  return apiClient.post<CheckoutSessionResponse>(
    `/billing/checkout?plan=${encodeURIComponent(plan)}`
  );
}

export async function createPortalSession(): Promise<BillingPortalResponse> {
  return apiClient.post<BillingPortalResponse>("/billing/portal");
}

import { apiClient } from "./client";
import type { TariffLandedCostResponse } from "@/types/api";

export interface LandedCostParams {
  hs_code: string;
  origin: string;
  destination: string;
  value_cents: number;
}

export async function calculateLandedCost(
  params: LandedCostParams
): Promise<TariffLandedCostResponse> {
  return apiClient.get<TariffLandedCostResponse>("/tariffs/calculate", {
    hs_code: params.hs_code,
    origin: params.origin,
    destination: params.destination,
    value_cents: params.value_cents,
  });
}

import { apiClient } from "./client";
import type { JobStatusResponse } from "@/types/api";

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  return apiClient.get<JobStatusResponse>(`/jobs/${jobId}`);
}

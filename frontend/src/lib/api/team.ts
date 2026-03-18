import type { InviteRequest, TeamMember, UpdateRoleRequest } from "@/types/api";
import { apiClient } from "./client";

export async function listTeamMembers(): Promise<TeamMember[]> {
  return apiClient.get<TeamMember[]>("/team");
}

export async function inviteMember(data: InviteRequest): Promise<TeamMember> {
  return apiClient.post<TeamMember>("/team", data);
}

export async function updateMemberRole(
  memberId: string,
  data: UpdateRoleRequest,
): Promise<TeamMember> {
  return apiClient.patch<TeamMember>(`/team/${memberId}`, data);
}

export async function removeMember(memberId: string): Promise<void> {
  return apiClient.delete<void>(`/team/${memberId}`);
}

import api from "./api";

export type MemberCheckInPass =
  | { state: "READY"; qrToken: string; expiresAt: string }
  | { state: "CHECKED_IN"; checkedInAt: string | null }
  | { state: "NOT_VALID_TODAY"; reason: string }
  | { state: "EXPIRED"; reason: string };

export const checkInService = {
  getMyPass: async (gymId: number): Promise<MemberCheckInPass> => {
    const response = (await api.get<{
      data?: MemberCheckInPass;
      error?: { message?: string } | null;
    }>("/me/pass", { params: { gymId } })) as unknown as {
      data?: MemberCheckInPass;
      error?: { message?: string } | null;
    };
    if (response.error || !response.data?.state) {
      throw new Error(response.error?.message ?? "Unable to load your check-in pass.");
    }
    return response.data;
  },
};

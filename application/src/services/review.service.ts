import api, { unwrapApiResponse } from "./api";
import type { MemberReview } from "../types/review.types";

export const reviewService = {
  getMine: async (): Promise<MemberReview[]> => {
    const response = await api.get<
      { success: boolean; reviews: MemberReview[] } |
      { data: { success: boolean; reviews: MemberReview[] } }
    >("/sessions/reviews/mine");
    const normalized = unwrapApiResponse(response) as {
      success?: boolean;
      reviews?: MemberReview[];
    };
    if (!normalized?.success || !Array.isArray(normalized.reviews)) {
      throw new Error("Your reviews were not returned by the API.");
    }
    return normalized.reviews;
  },
};

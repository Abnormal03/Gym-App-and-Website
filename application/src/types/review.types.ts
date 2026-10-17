export interface MemberReview {
  id: number;
  sessionId: number;
  providerId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  provider: { id: number; name: string; type: string; photoUrl: string | null };
  session: {
    startsAt: string;
    endsAt: string;
    booking: {
      gym: { id: number; name: string };
      package: { id: number; name: string } | null;
    };
  };
}

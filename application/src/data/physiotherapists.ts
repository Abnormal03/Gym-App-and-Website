export type PhysiotherapistReview = {
  reviewer: string;
  initials: string;
  date: string;
  comment: string;
};

export type PhysiotherapistProfile = {
  id: number;
  name: string;
  rating: number;
  experienceYears: number | null;
  specialization: string | null;
  profilePhotoUrl: string | null;
  sessionPrice: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  reviewCount: number;
  sessionCount: number;
  specialtyLabel: string;
  biography: string;
  reviews: PhysiotherapistReview[];
};

export const physiotherapists: PhysiotherapistProfile[] = [
  {
    id: 5,
    name: "Dr. Biruk Alemu, DPT",
    rating: 4.99,
    experienceYears: 9,
    specialization: "Sports Orthopedics",
    profilePhotoUrl:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-1ojoEsAycQvSrLAYtsTpnRs8joYbQP.png",
    sessionPrice: "600.00",
    verificationStatus: "VERIFIED",
    reviewCount: 156,
    sessionCount: 380,
    specialtyLabel: "SPORTS ORTHOPEDICS & REHABILITATION",
    biography:
      "Doctor of Physical Therapy specializing in sports orthopedics and injury rehabilitation. Combines evidence-based treatment with individualized recovery plans to help athletes return to activity safely and confidently.",
    reviews: [
      {
        reviewer: "Abebe B.",
        initials: "AB",
        date: "2 days ago",
        comment:
          "Dr. Biruk explained my recovery plan clearly and helped me return to training with confidence.",
      },
      {
        reviewer: "Marta K.",
        initials: "MK",
        date: "1 week ago",
        comment:
          "Very attentive and thorough. The exercises were practical, and I could feel my mobility improving.",
      },
      {
        reviewer: "Fitsum T.",
        initials: "FT",
        date: "2 weeks ago",
        comment:
          "Professional care and steady progress every visit. I highly recommend him.",
      },
    ],
  },
  {
    id: 6,
    name: "Helen Tesfaye, PT",
    rating: 4.96,
    experienceYears: 7,
    specialization: "Lower Limb Recovery",
    profilePhotoUrl:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-1ojoEsAycQvSrLAYtsTpnRs8joYbQP.png",
    sessionPrice: "550.00",
    verificationStatus: "VERIFIED",
    reviewCount: 121,
    sessionCount: 295,
    specialtyLabel: "LOWER LIMB RECOVERY & MOBILITY",
    biography:
      "Physical therapist focused on lower-limb recovery, mobility, and strength after injury. Builds supportive, progressive treatment plans around each patient's goals and day-to-day needs.",
    reviews: [
      {
        reviewer: "Selam A.",
        initials: "SA",
        date: "3 days ago",
        comment:
          "Helen was encouraging throughout my knee recovery and made every exercise feel achievable.",
      },
      {
        reviewer: "Dawit M.",
        initials: "DM",
        date: "1 week ago",
        comment:
          "My walking and balance improved so much. The sessions were always focused and welcoming.",
      },
      {
        reviewer: "Rahel G.",
        initials: "RG",
        date: "2 weeks ago",
        comment:
          "A thoughtful therapist who listens and adjusts the plan as you improve.",
      },
    ],
  },
  {
    id: 7,
    name: "Natnael Desta, PT",
    rating: 4.92,
    experienceYears: 6,
    specialization: "Shoulder Mobility & Rehab",
    profilePhotoUrl:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-1ojoEsAycQvSrLAYtsTpnRs8joYbQP.png",
    sessionPrice: "500.00",
    verificationStatus: "PENDING",
    reviewCount: 87,
    sessionCount: 210,
    specialtyLabel: "SHOULDER MOBILITY & REHABILITATION",
    biography:
      "Physical therapist specializing in shoulder mobility and rehabilitation. Uses guided movement and individualized strength progressions to support comfortable, lasting return to everyday activities and sport.",
    reviews: [
      {
        reviewer: "Yonas H.",
        initials: "YH",
        date: "4 days ago",
        comment:
          "Natnael gave me a clear plan for rebuilding shoulder strength without pushing too quickly.",
      },
      {
        reviewer: "Liya S.",
        initials: "LS",
        date: "1 week ago",
        comment:
          "Great attention to detail and really helpful explanations at every session.",
      },
      {
        reviewer: "Kebede W.",
        initials: "KW",
        date: "3 weeks ago",
        comment:
          "I have much better range of motion and feel supported through the whole process.",
      },
    ],
  },
];

export function getPhysiotherapistProfile(physiotherapistId: number) {
  return physiotherapists.find(
    (physiotherapist) => physiotherapist.id === physiotherapistId,
  );
}

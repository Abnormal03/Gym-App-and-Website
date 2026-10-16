export type Trainer = {
  id: number;
  name: string;
  rating: number;
  experienceYears: number | null;
  specialization: string | null;
  profilePhotoUrl: string | null;
  profilePhotoAsset?: number;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
};

export type TrainerReview = {
  reviewer: string;
  initials: string;
  date: string;
  comment: string;
};

export type TrainerProfile = Trainer & {
  reviewCount: number;
  sessionCount: number;
  specialtyLabel: string;
  biography: string;
  reviews: TrainerReview[];
};

export const trainers: TrainerProfile[] = [
  {
    id: 1,
    name: "Dawit Getachew",
    rating: 4.98,
    experienceYears: 8,
    specialization: "Strength & body build",
    profilePhotoAsset: require("../../assets/trainer-dawit.png"),
    profilePhotoUrl:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-vzLUkKbxEzTMqxa9BYvo7oYkfHPxlS.png",
    verificationStatus: "VERIFIED",
    reviewCount: 184,
    sessionCount: 420,
    specialtyLabel: "BIOMECHANICS & STRENGTH HYPERTROPHY",
    biography:
      "Former Ethiopian National Powerlifting conditioning lead. Specializing in biomechanical joint alignment, posterior chain hypertrophy, and competitive lifting prep. Focused on zero-injury progressive overload.",
    reviews: [
      {
        reviewer: "Abebe Bikila",
        initials: "AB",
        date: "2 days ago",
        comment:
          "Dawit completely transformed my deadlift technique and posture. Within 3 weeks my lower back discomfort vanished.",
      },
      {
        reviewer: "Selam K.",
        initials: "SK",
        date: "1 week ago",
        comment:
          "Exceptional biomechanics focus. He watches every rep with razor focus. Well worth the session fee.",
      },
      {
        reviewer: "Mekdes T.",
        initials: "MT",
        date: "2 weeks ago",
        comment:
          "Clear coaching, thoughtful programming, and a real focus on safe progress.",
      },
    ],
  },
  {
    id: 2,
    name: "Selamawit Bekele",
    rating: 4.95,
    experienceYears: 6,
    specialization: "Olympic Weightlifting",
    profilePhotoUrl:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-1qmGCuBykNGW4wg36ztX9i2ddIKjUU.png",
    verificationStatus: "VERIFIED",
    reviewCount: 126,
    sessionCount: 310,
    specialtyLabel: "OLYMPIC WEIGHTLIFTING & TECHNIQUE",
    biography:
      "Olympic weightlifting coach helping athletes build strength, confidence, and consistent technique. Sessions focus on movement quality, progressive training, and goals tailored to each athlete.",
    reviews: [
      {
        reviewer: "Hana M.",
        initials: "HM",
        date: "3 days ago",
        comment:
          "Selamawit made the clean and jerk finally click for me. Every session has a clear purpose.",
      },
      {
        reviewer: "Robel A.",
        initials: "RA",
        date: "1 week ago",
        comment:
          "Patient, precise coaching. My technique has improved more in a month than all last year.",
      },
      {
        reviewer: "Mimi G.",
        initials: "MG",
        date: "2 weeks ago",
        comment:
          "Great energy and a smart plan that keeps me progressing without rushing.",
      },
    ],
  },
  {
    id: 3,
    name: "Yohannes Tadesse",
    rating: 4.91,
    experienceYears: 5,
    specialization: "Functional Gymnastics",
    profilePhotoUrl:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-PKWhvGjQDmnl5kQWKSfMz3gpV2HYNL.png",
    verificationStatus: "VERIFIED",
    reviewCount: 98,
    sessionCount: 245,
    specialtyLabel: "FUNCTIONAL FITNESS & GYMNASTICS",
    biography:
      "Functional fitness coach focused on body control, strength, and mobility. Builds practical progressions for athletes at every level, from first pull-up to advanced gymnastics skills.",
    reviews: [
      {
        reviewer: "Daniel B.",
        initials: "DB",
        date: "4 days ago",
        comment:
          "Yohannes broke down skills into steps I could actually follow. My first strict pull-up felt great.",
      },
      {
        reviewer: "Lulit W.",
        initials: "LW",
        date: "1 week ago",
        comment:
          "A motivating coach who pays attention to form and makes every session fun.",
      },
      {
        reviewer: "Samuel F.",
        initials: "SF",
        date: "3 weeks ago",
        comment:
          "Thoughtful progressions and a great balance of strength and mobility work.",
      },
    ],
  },
  {
    id: 4,
    name: "Liya Kassa",
    rating: 4.88,
    experienceYears: 4,
    specialization: "HIIT, Strength & Core",
    profilePhotoUrl:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-BYf0zAp7nkaPS1ysz9WggDTCikC5cV.png",
    verificationStatus: "PENDING",
    reviewCount: 73,
    sessionCount: 180,
    specialtyLabel: "HIIT, STRENGTH & CORE TRAINING",
    biography:
      "Strength and conditioning coach creating energetic, sustainable workouts. Specializes in HIIT, core stability, and helping athletes build a routine that fits their lifestyle.",
    reviews: [
      {
        reviewer: "Betelhem D.",
        initials: "BD",
        date: "2 days ago",
        comment:
          "Liya keeps the workouts challenging and fun. I feel stronger every week.",
      },
      {
        reviewer: "Teddy K.",
        initials: "TK",
        date: "6 days ago",
        comment:
          "Excellent coaching and modifications that meet you at your level.",
      },
      {
        reviewer: "Martha S.",
        initials: "MS",
        date: "2 weeks ago",
        comment:
          "I have more energy and a routine I can actually stick to. Highly recommend.",
      },
    ],
  },
];

export function getTrainerProfile(trainerId: number) {
  return trainers.find((trainer) => trainer.id === trainerId);
}

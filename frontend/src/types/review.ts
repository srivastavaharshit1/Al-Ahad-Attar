export interface Review {
  id: number;
  productId: number;
  userId: number;
  userName: string;
  rating: number;
  title?: string;
  description: string;
  isVerifiedPurchase: boolean;
  isHidden: boolean;
  adminReply?: string;
  imageUrls: string[];
  helpfulVotesCount: number;
  currentUserVotedHelpful: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummary {
  productId: number;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

export interface ReviewRequest {
  productId: number;
  rating: number;
  title?: string;
  description: string;
}

export interface ReportReviewRequest {
  reason: string;
  comments?: string;
}

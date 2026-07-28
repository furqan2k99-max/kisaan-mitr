"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { ratingsApi, Rating } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare } from "lucide-react";

function StarRating({ rating, interactive = false, onChange }: { rating: number; interactive?: boolean; onChange?: (r: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(star)}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            className={`h-5 w-5 ${
              star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function RatingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [receivedRatings, setReceivedRatings] = useState<Rating[]>([]);
  const [givenRatings, setGivenRatings] = useState<Rating[]>([]);
  const [avgRating, setAvgRating] = useState({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"received" | "given">("received");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [isAuthenticated, router]);

  const fetchData = async () => {
    try {
      const [received, given, stats] = await Promise.all([
        ratingsApi.getReceived(),
        ratingsApi.getGiven(),
        ratingsApi.getUserStats(user?.id || "")
      ]);
      setReceivedRatings(received);
      setGivenRatings(given);
      setAvgRating(stats);
    } catch (error) {
      console.error("Failed to fetch ratings:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  const ratings = activeTab === "received" ? receivedRatings : givenRatings;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ratings</h1>
        <p className="text-gray-400 text-sm">See what others say about you</p>
      </div>

      {/* Rating Summary */}
      <div className="p-6 rounded-2xl border border-[#1e4029] bg-[#162d1e]">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-green-600 text-white text-xl">
              {user?.full_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-white">{avgRating.average}</span>
              <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
            </div>
            <p className="text-gray-400 text-sm">{avgRating.count} reviews</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("received")}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === "received"
              ? "bg-green-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Received ({receivedRatings.length})
        </button>
        <button
          onClick={() => setActiveTab("given")}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === "given"
              ? "bg-green-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Given ({givenRatings.length})
        </button>
      </div>

      {/* Ratings List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : ratings.length === 0 ? (
        <div className="text-center py-12 border border-[#1e4029] rounded-2xl bg-[#162d1e]">
          <Star className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No ratings yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ratings.map((rating) => (
            <div
              key={rating.id}
              className="p-4 rounded-2xl border border-[#1e4029] bg-[#162d1e]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-green-600 text-white text-sm">
                      {activeTab === "received" ? "U" : "Y"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <StarRating rating={rating.rating} />
                    {rating.comment && (
                      <p className="text-gray-300 text-sm mt-2 flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                        {rating.comment}
                      </p>
                    )}
                    <p className="text-gray-500 text-xs mt-2">
                      {new Date(rating.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

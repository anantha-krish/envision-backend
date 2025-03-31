import axios from "axios";
import { API_GATEWAY_URL } from "./config";

export async function getEngagementMetrics(ideaIds: number[]) {
  try {
    if (ideaIds.length === 0) return {};

    const response = await axios.get(
      `${API_GATEWAY_URL}/api/engagement/metrics`,
      {
        params: { ideaIds: ideaIds.join(",") },
      }
    );

    return response.data; // { ideaId: { likes: X, comments: Y }, ... }
  } catch (error) {
    console.error("Error fetching engagement metrics:", error);
    return {};
  }
}

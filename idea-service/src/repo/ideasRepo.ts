import { db } from "../db/db.connection";
import {
  ideas,
  ideaStatus,
  ideaSubmitters,
  ideaTags,
  tags,
} from "../db/schema";
import {
  eq,
  inArray,
  sql,
  desc,
  count,
  and,
  gte,
  lte,
  like,
} from "drizzle-orm";
import {
  delValue,
  getCommentedIdeasKeys,
  getLikedIdeasKeys,
  getValue,
  getViewedIdeasKeys,
  getViews,
  incrementViews,
  mgetComments,
  mgetLikes,
  mgetViews,
} from "../redis_client";
import { view } from "drizzle-orm/sqlite-core";
export const validSortOptions = [
  "popular",
  "trend",
  "most_liked",
  "most_viewed",
  "recent",
] as const;
export type SortOption = (typeof validSortOptions)[number];
class IdeaRepository {
  async createIdea(
    title: string,
    summary: string,
    description: string,
    managerId: number,
    statusId: number,
    tags: number[],
    submittedBy: number[]
  ) {
    const result = await db
      .insert(ideas)
      .values({
        title,
        summary,
        description,
        managerId,
        statusId,
      })
      .returning({
        ideaId: ideas.id,
        title: ideas.title,
        summary: ideas.summary,
        description: ideas.description,
        managerId: ideas.managerId,
        statusId: ideas.statusId,
        createdAt: ideas.createdAt,
      });

    const idea = result[0];

    // Insert tags if provided
    if (tags.length > 0) {
      var tagValues = tags.map((tag) => ({
        ideaId: idea.ideaId,
        tagId: tag, // Assuming tag is the tagId
      }));
      await db.insert(ideaTags).values(tagValues);
    }

    if (submittedBy.length > 0) {
      await db.insert(ideaSubmitters).values(
        submittedBy.map((userId) => ({
          ideaId: idea.ideaId,
          userId,
        }))
      );
    }

    return idea;
  }

  async getIdeaById(ideaId: number) {
    const ideaResult = await db
      .select({
        id: ideas.id,
        title: ideas.title,
        summary: ideas.summary,
        description: ideas.description,
        status: ideaStatus.name, // Get status text
        likes: ideas.likesCount,
        comments: ideas.commentsCount,
        views: ideas.views,
        managerId: ideas.managerId,
        createdAt: ideas.createdAt,
        updatedAt: ideas.updatedAt,
      })
      .from(ideas)
      .innerJoin(ideaStatus, eq(ideas.statusId, ideaStatus.id))
      .where(eq(ideas.id, ideaId));

    if (!ideaResult.length) return null; // Return null if idea not found

    // Fetch associated tags
    const tagResults = await db
      .select({ name: tags.name })
      .from(ideaTags)
      .innerJoin(tags, eq(ideaTags.tagId, tags.id))
      .where(eq(ideaTags.ideaId, ideaId));

    const submittedByResults = await db
      .select({ userId: ideaSubmitters.userId })
      .from(ideaSubmitters)
      .where(eq(ideaSubmitters.ideaId, ideaId));

    incrementViews(ideaId);

    return {
      ...ideaResult[0],
      tags: tagResults.map((tag) => tag.name) || [], // Convert to string
      submittedBy: submittedByResults.map((s) => s.userId),
    };
  }

  async deleteIdea(ideaId: number) {
    return db.delete(ideas).where(eq(ideas.id, ideaId));
  }

  async updateIdeaStatus(ideaId: number, statusId: number) {
    return db
      .update(ideas)
      .set({ statusId })
      .where(eq(ideas.id, ideaId))
      .returning();
  }

  async updateIdeaTags(ideaId: number, tagNames: string[]) {
    // Fetch existing tag IDs or insert new tags
    const existingTags = await db
      .select()
      .from(tags)
      .where(inArray(tags.name, tagNames));

    const existingTagMap = new Map(existingTags.map((t) => [t.name, t.id]));
    const newTags = tagNames.filter((tag) => !existingTagMap.has(tag));

    let newTagIds: number[] = [];
    if (newTags.length > 0) {
      const insertedTags = await db
        .insert(tags)
        .values(newTags.map((name) => ({ name })))
        .returning({ id: tags.id, name: tags.name });

      newTagIds = insertedTags.map((t) => t.id);
    }

    const allTagIds = [...existingTagMap.values(), ...newTagIds];

    // Delete existing tags for the idea
    await db.delete(ideaTags).where(eq(ideaTags.ideaId, ideaId));

    // Insert new tag associations
    await db
      .insert(ideaTags)
      .values(allTagIds.map((tagId) => ({ ideaId, tagId })));

    return { message: "Tags updated successfully" };
  }

  async updateIdeaContent(
    ideaId: number,
    title?: string,
    summary?: string,
    description?: string
  ) {
    const updateFields: Partial<{
      title: string;
      summary: string;
      description: string;
    }> = {};
    if (title) updateFields.title = title;
    if (summary) updateFields.summary = summary;
    if (description) updateFields.description = description;

    return db
      .update(ideas)
      .set(updateFields)
      .where(eq(ideas.id, ideaId))
      .returning();
  }

  _getOrderByClause = (sortBy: SortOption) => {
    switch (sortBy) {
      case "popular":
        return sql`(${ideas.likesCount} + ${ideas.commentsCount}) DESC`;
      case "trend":
        return sql`(${ideas.likesCount} + ${ideas.commentsCount})::float / EXTRACT(EPOCH FROM (NOW() - ${ideas.createdAt})) DESC`;
      case "most_liked":
        return sql`${ideas.likesCount} DESC`;
      case "most_viewed":
        return sql`${ideas.views} DESC`;
      case "recent":
      default:
        return sql`${ideas.createdAt} DESC`;
    }
  };

  async getAllIdeas(
    page: number = 1,
    pageSize: number = 10,
    sortBy: SortOption
  ) {
    const offset = (page - 1) * pageSize;
    const orderBy = this._getOrderByClause(sortBy);

    return await db
      .select({
        id: ideas.id,
        title: ideas.title,
        summary: ideas.summary,
        status: ideaStatus.name,
        likes: ideas.likesCount,
        comments: ideas.commentsCount,
        views: ideas.views,
        createdAt: ideas.createdAt,
      })
      .from(ideas)
      .innerJoin(ideaStatus, eq(ideas.statusId, ideaStatus.id))
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);
  }

  async getViews(ideaId: number): Promise<number> {
    const redisViews = await getViews(ideaId);

    if (redisViews !== null) {
      return parseInt(redisViews);
    }

    // If not in Redis, fetch from DB
    const result = await db
      .select({ views: ideas.views })
      .from(ideas)
      .where(eq(ideas.id, ideaId));

    return result[0]?.views || 0;
  }
  async syncEngagementStatsToDB() {
    console.log("🔄 Syncing views, likes, and comments from Redis to DB...");

    // Step 1: Fetch idea IDs separately for views, likes, and comments
    const viewedIdeaKeys = await getViewedIdeasKeys(); // e.g., "views:123"
    const likedIdeaKeys = await getLikedIdeasKeys(); // e.g., "likes:123"
    const commentedIdeaKeys = await getCommentedIdeasKeys(); // e.g., "comments:123"

    const viewedIdeaIds = viewedIdeaKeys.map((id) =>
      parseInt(id.split(":")[1])
    );
    const likedIdeaIds = likedIdeaKeys.map((id) => parseInt(id.split(":")[1]));
    const commentedIdeaIds = commentedIdeaKeys.map((id) =>
      parseInt(id.split(":")[1])
    );

    // Step 2: Merge all unique idea IDs
    const ideaIds = [
      ...new Set([...viewedIdeaIds, ...likedIdeaIds, ...commentedIdeaIds]),
    ];

    if (ideaIds.length === 0) {
      console.log("✅ No engagement stats to sync.");
      return;
    }

    // Step 3: Get views, likes, and comments from Redis in bulk
    const viewCounts = await mgetViews(ideaIds);
    const likeCounts = await mgetLikes(ideaIds);
    const commentCounts = await mgetComments(ideaIds);

    // Step 4: Fetch existing stats from the database
    const existingStats = await db
      .select({
        ideaId: ideas.id,
        views: ideas.views,
        likes: ideas.likesCount,
        comments: ideas.commentsCount,
      })
      .from(ideas)
      .where(inArray(ideas.id, ideaIds));

    // Convert existing stats to a map for quick lookup
    const existingStatsMap = Object.fromEntries(
      existingStats.map((row) => [row.ideaId, row])
    );

    // Step 5: Prepare updates for only changed records
    const updates: {
      id: number;
      views: number;
      likes: number;
      comments: number;
    }[] = [];

    for (let i = 0; i < ideaIds.length; i++) {
      const ideaId = ideaIds[i];
      const redisViews = parseInt(viewCounts[i] || "0");
      const redisLikes = parseInt(likeCounts[i] || "0");
      const redisComments = parseInt(commentCounts[i] || "0");

      const dbStats = existingStatsMap[ideaId] || {
        views: 0,
        likes: 0,
        comments: 0,
      };

      if (
        redisViews > dbStats.views ||
        redisLikes > dbStats.likes ||
        redisComments > dbStats.comments
      ) {
        updates.push({
          id: ideaId,
          views: Math.max(redisViews, dbStats.views),
          likes: Math.max(redisLikes, dbStats.likes),
          comments: Math.max(redisComments, dbStats.comments),
        });
      }
    }

    if (updates.length > 0) {
      // Use db.batch() to run multiple updates in one query
      const values = updates
        .map(
          ({ id, views, likes, comments }) =>
            `(${id}, ${views}, ${likes}, ${comments})`
        )
        .join(",");

      const updateQuery = sql`
    UPDATE ideas
    SET 
      views = data.views, 
      likes_count = data.likes, 
      comments_count = data.comments
    FROM (VALUES ${sql.raw(values)}) 
      AS data(id, views, likes, comments)
    WHERE ideas.id = data.id;
  `;

      await db.execute(updateQuery);
      console.log(`✅ Synced ${updates.length} engagement stats to DB.`);
    } else {
      console.log("✅ No updates needed.");
    }

    // Step 7: Optional - Clear Redis after syncing
    await delValue(ideaIds.map(String));
  }

  async fetchTagsForIdeas(ideaIds) {
    // Fetch tags
    return await db
      .select({ ideaId: ideaTags.ideaId, tagName: tags.name })
      .from(ideaTags)
      .innerJoin(tags, eq(ideaTags.tagId, tags.id))
      .where(inArray(ideaTags.ideaId, ideaIds));
  }

  async getIdeasSubmissionsByRange(startTimestamp: Date, endTimestamp: Date) {
    return await db
      .select({
        date: sql<string>`TO_CHAR(${ideas.createdAt}, 'YYYY-MM-DD')`,
        count: count(),
      })
      .from(ideas)
      .where(
        and(
          gte(ideas.createdAt, startTimestamp),
          lte(ideas.createdAt, endTimestamp)
        )
      )
      .groupBy(sql`TO_CHAR(${ideas.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${ideas.createdAt}, 'YYYY-MM-DD')`);
  }

  async getTopContributors() {
    return await db
      .select({
        userId: ideaSubmitters.userId,
        ideaCount: count(ideas.id).as("ideaCount"),
      })
      .from(ideaSubmitters) // Join from idea_submitters
      .innerJoin(ideas, eq(ideaSubmitters.ideaId, ideas.id)) // Get associated ideas
      .groupBy(ideaSubmitters.userId)
      .orderBy(desc(count(ideas.id)))
      .limit(5);
  }
  async getIdeaStatusDistribution() {
    return await db
      .select({
        status: ideaStatus.name,
        count: count(),
      })
      .from(ideas)
      .innerJoin(ideaStatus, eq(ideas.statusId, ideaStatus.id))
      .groupBy(ideaStatus.id)
      .orderBy(ideaStatus.id);
  }

  async getStatusName(statusId: number) {
    const [status] = await db
      .select()
      .from(ideaStatus)
      .where(eq(ideaStatus.id, statusId))
      .limit(1);
    return status.name;
  }

  async getTopIdeas() {}
}
export const ideaRepo = new IdeaRepository();

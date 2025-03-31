import { db } from "../db/db.connection";
import {
  ideas,
  ideaStatus,
  ideaSubmitters,
  ideaTags,
  tags,
} from "../db/schema";
import { eq, inArray, sql, desc, count, and, gte, lte } from "drizzle-orm";
import {
  delValue,
  getAllIdeasKeys,
  getValue,
  getViews,
  incrementViews,
  mgetViews,
} from "../redis_client";

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

  async getAllIdeas(
    page: number,
    pageSize: number = 10,
    sortBy: string = "recent"
  ) {
    const offset = (page - 1) * pageSize;

    // Fetch ideas from DB
    const ideasList = await db
      .select({
        id: ideas.id,
        title: ideas.title,
        summary: ideas.summary,
        status: ideaStatus.name,
        createdAt: ideas.createdAt,
      })
      .from(ideas)
      .innerJoin(ideaStatus, eq(ideas.statusId, ideaStatus.id))
      .limit(pageSize)
      .offset(offset);

    return ideasList;
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
  async syncViewsToDB() {
    console.log("🔄 Syncing views from Redis to DB...");

    // Step 1: Fetch all idea IDs stored in Redis
    const ideaKeys = await getAllIdeasKeys();
    const ideaIds = ideaKeys.map((id) => parseInt(id.split(":")[1]));

    if (ideaIds.length === 0) {
      console.log("✅ No views to sync.");
      return;
    }

    // Step 2: Get views from Redis in bulk
    const viewCounts = await mgetViews(ideaIds);

    // Step 3: Fetch existing views from the database
    const existingViews = await db
      .select({
        ideaId: ideas.id,
        views: ideas.views, // Existing views column
      })
      .from(ideas)
      .where(inArray(ideas.id, ideaIds));

    // Convert existing views to a map for quick lookup
    const existingViewsMap = Object.fromEntries(
      existingViews.map((row) => [row.ideaId, row.views])
    );

    // Step 4: Update only if Redis views are higher
    const updates: { id: number; views: number }[] = [];
    for (let i = 0; i < ideaIds.length; i++) {
      const ideaId = ideaIds[i];
      const redisViews = parseInt(viewCounts[i] || "0");
      const dbViews = existingViewsMap[ideaId] || 0;

      if (redisViews > dbViews) {
        updates.push({
          id: ideaId,
          views: redisViews, // Use max(redisViews, dbViews)
        });
      }
    }

    // Step 5: Bulk update views in the database
    if (updates.length > 0) {
      await db.transaction(async (tx) => {
        for (const { id, views } of updates) {
          await tx.update(ideas).set({ views }).where(eq(ideas.id, id));
        }
      });
      console.log(`✅ Synced ${updates.length} views to DB.`);
    } else {
      console.log("✅ No updates needed.");
    }

    // Optional: Clear Redis views after syncing
    await delValue(ideaIds.map(toString));
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
}
export const ideaRepo = new IdeaRepository();

import { db } from "../db/db.connection";
import {
  ideas,
  ideaStatus,
  ideaSubmitters,
  ideaTags,
  tags,
} from "../db/schema";
import { eq, inArray, sql } from "drizzle-orm";
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

  async getAllIdeas(page: number, pageSize: number = 10) {
    const offset = (page - 1) * pageSize; // Pagination offset

    // Step 1: Fetch only ideas (without joins)
    const ideasList = await db
      .select({
        id: ideas.id,
        title: ideas.title,
        summary: ideas.summary,
        status: ideaStatus.name,
      })
      .from(ideas)
      .innerJoin(ideaStatus, eq(ideas.statusId, ideaStatus.id))
      .limit(pageSize)
      .offset(offset);

    if (ideasList.length === 0) return []; // Return early if no ideas found

    // Step 2: Fetch tags separately for retrieved ideas
    const ideaIds = ideasList.map((idea) => idea.id);

    const tagResults = await db
      .select({
        ideaId: ideaTags.ideaId,
        tagName: tags.name,
      })
      .from(ideaTags)
      .innerJoin(tags, eq(ideaTags.tagId, tags.id))
      .where(inArray(ideaTags.ideaId, ideaIds));

    // Step 3: Fetch views from Redis in bulk
    const viewCounts = await mgetViews(ideaIds);

    // Step 4: Combine results efficiently
    const tagsMap: Record<number, string[]> = {};
    tagResults.forEach(({ ideaId, tagName }) => {
      if (!tagsMap[ideaId]) tagsMap[ideaId] = [];
      tagsMap[ideaId].push(tagName);
    });

    const finalResults = ideasList.map((idea, index) => ({
      ...idea,
      tags: tagsMap[idea.id] || [], // Convert array to string
      views: viewCounts[index] ? parseInt(viewCounts[index] || "0") : 0, // Parse Redis views
    }));

    return finalResults;
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
    const keys = await getAllIdeasKeys();

    for (const key of keys) {
      const ideaId = parseInt(key.split(":")[1]); // Extract ID
      const views = await getValue(key);

      if (views) {
        await db
          .update(ideas)
          .set({ views: parseInt(views) })
          .where(eq(ideas.id, ideaId));

        await delValue(key); // Clear Redis after sync
      }
    }
  }
}

export const ideaRepo = new IdeaRepository();

import { db } from "../db/db.connection";
import { ideas, ideaStatus, ideaTags, tags } from "../db/schema";
import { eq, inArray } from "drizzle-orm";

class IdeaRepository {
  async createIdea(
    title: string,
    summary: string,
    description: string,
    managerId: number,
    statusId: number,
    tags: string[],
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
      .returning();

    const idea = result[0];

    // Insert tags if provided
    if (tags.length > 0) {
      await db.insert(ideaTags).values(
        tags.map((tag) => ({
          ideaId: idea.id,
          tagId: tag, // Assuming tag is the tagId
        }))
      );
    }

    return idea;
  }

  async getIdeaById(ideaId: number) {
    const result = await db
      .select({
        id: ideas.id,
        title: ideas.title,
        summary: ideas.summary,
        description: ideas.description,
        status: ideaStatus.name, // Get status text instead of ID
        managerId: ideas.managerId,
        createdAt: ideas.createdAt,
        updatedAt: ideas.updatedAt,
        tags: db
          .select({ name: tags.name })
          .from(ideaTags)
          .innerJoin(tags, eq(ideaTags.tagId, tags.id))
          .where(eq(ideaTags.ideaId, ideaId))
          .then((results) => results.map((row) => row.name).join(",")),
      })
      .from(ideas)
      .innerJoin(ideaStatus, eq(ideas.statusId, ideaStatus.id)) // Join status table
      .where(eq(ideas.id, ideaId));

    return result[0] ?? null; // Return first
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
}

export const ideaRepo = new IdeaRepository();

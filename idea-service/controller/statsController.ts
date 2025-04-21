import { Request, Response } from "express";
import { startOfMonth, endOfDay, formatISO, startOfDay } from "date-fns";
import { ideaRepo } from "../src/repo/ideasRepo";
import { db } from "../src/db/db.connection";
import { ideas, ideaTags, tags } from "../src/db/schema";
import { count, eq, gte, and, desc, lte } from "drizzle-orm";

export const getIdeaSubmissions = async (req: Request, res: Response) => {
  var currentDate = Date.now();
  const startDate =
    (req.query.startDate as string) ??
    formatISO(startOfMonth(currentDate), { representation: "date" });
  const endDate =
    (req.query.endDate as string) ??
    formatISO(currentDate, { representation: "date" });
  const startTimestamp = startOfDay(startDate);
  const endTimestamp = endOfDay(endDate);
  var result = await ideaRepo.getIdeasSubmissionsByRange(
    startTimestamp,
    endTimestamp
  );
  res.status(200).json(result);
};
export const getTopContributors = async (req: Request, res: Response) => {
  var result = await ideaRepo.getTopContributors();
  // TODO resolve userId to user name
  res.status(200).json(result);
};
export const getIdeaStatusDistribution = async (
  req: Request,
  res: Response
) => {
  var result = await ideaRepo.getIdeaStatusDistribution();
  res.status(200).json(result);
};

export const getTopIdeas = async (req: Request, res: Response) => {
  const ideasList = await ideaRepo.getAllIdeas(1, 3, "popular", "DESC");
  if (ideasList.length === 0) {
    res.status(200).json({});
    return;
  }

  const finalResults = ideasList.map((idea) => {
    return {
      title: idea.title,
      likes: idea.likes || 0,
      comments: idea.comments || 0,
    };
  });

  res.status(200).json(finalResults);
};

export const getTrendingTags = async (req: Request, res: Response) => {
  var currentDate = Date.now();
  const startDate =
    (req.query.startDate as string) ??
    formatISO(startOfMonth(currentDate), { representation: "date" });
  const endDate =
    (req.query.endDate as string) ??
    formatISO(currentDate, { representation: "date" });
  const startTimestamp = startOfDay(startDate);
  const endTimestamp = endOfDay(endDate);
  var result = await db
    .select({
      tag: tags.name,
      count: count(ideaTags.ideaId).as("count"),
    })
    .from(ideaTags)
    .innerJoin(tags, eq(ideaTags.tagId, tags.id))
    .innerJoin(ideas, eq(ideaTags.ideaId, ideas.id))
    .where(
      and(
        gte(ideas.createdAt, startTimestamp),
        lte(ideas.createdAt, endTimestamp)
      )
    )
    .groupBy(tags.name)
    .orderBy(desc(count(ideaTags.ideaId)))
    .limit(5);
  res.status(200).json(result);
};

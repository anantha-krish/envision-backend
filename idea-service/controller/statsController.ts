import { Request, Response } from "express";
import { startOfMonth, endOfDay, formatISO, startOfDay } from "date-fns";
import { ideaRepo } from "../src/repo/ideasRepo";
import { getEngagementMetrics } from "../src/kafka/engagementAsync";

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
  const ideasList = await ideaRepo.getAllIdeas(1, 10);
  if (ideasList.length === 0) {
    res.status(200).json({});
    return;
  }

  const ideaIds = ideasList.map((idea) => idea.id);

  // Fetch likes & comments via API Gateway (Engagement Service)
  const engagementMetrics: Record<any, any>[] = await getEngagementMetrics(
    ideaIds
  );

  const finalResults = ideasList.map((idea) => {
    return {
      title: idea.title,
      likes: engagementMetrics[idea.id]?.likes || 0,
      comments: engagementMetrics[idea.id]?.comments || 0,
    };
  });

  finalResults.sort((a, b) => b.likes + b.comments - (a.likes + a.comments));
  res.status(200).json(finalResults);
};

import { Request, Response } from "express";
import { startOfMonth, endOfDay, formatISO, startOfDay } from "date-fns";
import { ideaRepo } from "../src/repo/ideasRepo";

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
  res.status(200).json(result);
};
export const getIdeaStatusDistribution = async (
  req: Request,
  res: Response
) => {
  var result = await ideaRepo.getIdeaStatusDistribution();
  res.status(200).json(result);
};

import express, { Request, Response } from "express";
import upload from "./config/multer-config";
import { getSignedFileUrl, s3Client } from "./config/s3-config";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { AWS_S3_BUCKET_NAME } from "./config/env";
import { uploadFilesToS3 } from "./uploadFile";

const router = express.Router();
router.post(
  "/upload",
  upload.array("files", 10),
  async (req: Request, res: Response) => {
    if (!req.files || !(req.files instanceof Array)) {
      res.status(400).json({ message: "No files uploaded!" });
      return;
    }
    try {
      const ideaId = (req.query.ideaId as string) ?? "";
      if (ideaId.length === 0) {
        throw Error("No ideaId found");
        return;
      }
      const fileUrls = await uploadFilesToS3(
        ideaId,
        req.files as Express.Multer.File[]
      );
      res.json({ message: "Files uploaded successfully!", fileUrls });
    } catch (error) {
      res.status(500).json({ error: "File upload failed!" });
    }
  }
);

// ✅ List Uploaded Files
router.get("/files", async (req: Request, res: Response) => {
  const ideaId = (req.query.ideaId as string) ?? "";
  try {
    const data = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: AWS_S3_BUCKET_NAME,
        ...(ideaId && ideaId.length > 0
          ? { Prefix: `idea-uploads/${ideaId}` }
          : {}),
      })
    );
    const files = data.Contents
      ? await Promise.all(
          data.Contents.map(async (file) => ({
            key: file.Key,
            url: await getSignedFileUrl(file.Key ?? ""),
          }))
        )
      : [];
    res.json({ files });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

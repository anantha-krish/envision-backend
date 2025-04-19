import { Request, Response } from "express";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { AWS_S3_BUCKET_NAME } from "./config/env";
import { uploadFilesToS3 } from "./uploadFile";
import { getSignedFileUrl, s3Client } from "./config/s3-config";
import { sendFileAddedUpdate } from "./producer";

export const uploadFileHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.files || !(req.files instanceof Array)) {
    res.status(400).json({ message: "No files uploaded!" });
    return;
  }
  try {
    const ideaId = +(req.query.ideaId ?? "");
    const isEditMode = req.query.edit === "true";
    const userId = parseInt((req.headers.user_id as string) ?? "-1");

    if (isNaN(ideaId)) {
      throw Error("No ideaId found");
    }
    const fileUrls = await uploadFilesToS3(
      ideaId.toString(),
      req.files as Express.Multer.File[]
    );

    if (isEditMode) {
      const fileNames = req.files.map((file) => file.originalname);
      let displayNames = "";
      if (fileNames.length === 1) {
        displayNames = fileNames[0];
      } else if (fileNames.length === 2) {
        displayNames = `${fileNames[0]} and ${fileNames[1]}`;
      } else if (fileNames.length > 2) {
        const lastFile = fileNames.pop();
        displayNames = `${fileNames.join(", ")} and ${lastFile}`;
      }

      const recipientsMap =
        req.body.recipients
          ?.split(",")
          .map(Number)
          .filter((id: number) => !isNaN(id)) ?? [];

      const recipients = Array.from(
        new Set([...recipientsMap, ...(userId > -1 ? [userId] : [])])
      );
      await sendFileAddedUpdate({
        actorId: userId,
        ideaId: +ideaId,
        recipients,
        messageText: `has uploaded ${displayNames}`,
      });
    }

    res.status(201).json({ message: "Files uploaded successfully!", fileUrls });
  } catch (error) {
    res.status(500).json({ error: "File upload failed!" });
  }
};

export const deleteAttachementHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const ideaId = req.params.ideaId;
  if (!ideaId) {
    res.status(400).json({ message: "ideaId is required" });
    return;
  }
  try {
    const data = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: AWS_S3_BUCKET_NAME,
        Prefix: `idea-uploads/${ideaId}`,
      })
    );

    const filesToDelete = data.Contents
      ? await Promise.all(
          data.Contents.map(async ({ Key }) => ({
            Key,
          }))
        )
      : [];

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Delete: {
        Objects: filesToDelete,
        Quiet: false,
      },
    });

    await s3Client.send(deleteCommand);

    res.json({
      message: `Deleted ${filesToDelete.length} files successfully.`,
      deletedFiles: filesToDelete.map((file) => file.Key),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteOneAttachementHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fileId = req.params[0];

  if (!fileId) {
    res.status(400).json({ message: "FileId is required" });
    return;
  }
  try {
    // Delete the file from S3
    const deleteCommand = new DeleteObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: fileId,
    });

    await s3Client.send(deleteCommand);

    res.json({ message: "File deleted successfully from S3" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllAttachments = async (
  req: Request,
  res: Response
): Promise<void> => {
  const ideaId = req.params.ideaId ?? "";
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
};

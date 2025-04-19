import express, { Request, Response } from "express";
import upload from "./config/multer-config";
import { getSignedFileUrl, s3Client } from "./config/s3-config";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { AWS_S3_BUCKET_NAME } from "./config/env";
import { uploadFilesToS3 } from "./uploadFile";
import {
  deleteAttachementHandler,
  deleteOneAttachementHandler,
  getAllAttachments as getAllAttachmentsHandler,
  uploadFileHandler,
} from "./fileController";

const router = express.Router();

router
  .get("/:ideaId?", getAllAttachmentsHandler)
  .post("/", upload.array("files", 10), uploadFileHandler)
  .delete("/:ideaId", deleteAttachementHandler);

router.delete("/*", deleteOneAttachementHandler);

export default router;

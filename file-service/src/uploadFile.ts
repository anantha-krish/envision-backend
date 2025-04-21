import {
  PutObjectAclCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { s3Client } from "./config/s3-config";
import { v4 as uuidv4 } from "uuid";
import { AWS_REGION, AWS_S3_BUCKET_NAME } from "./config/env";

export const uploadFilesToS3 = async (
  ideaId: string,
  files: Express.Multer.File[]
): Promise<string[]> => {
  const uploadPromises = files.map(async (file) => {
    const fileKey = `idea-uploads/${ideaId}/${uuidv4()}-${file.originalname}`;

    const uploadParams: PutObjectCommandInput = {
      Bucket: AWS_S3_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      await s3Client.send(new PutObjectCommand(uploadParams));
    } catch (error) {
      console.error("Upload failed:", error);
    }

    return `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileKey}`;
  });

  return Promise.all(uploadPromises);
};

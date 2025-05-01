import {
  CopyImageCommand,
  DescribeImagesCommand,
  DescribeImagesCommandInput,
  EC2Client,
  waitUntilImageAvailable,
} from '@aws-sdk/client-ec2';

const ec2Client = new EC2Client();

export interface AMIInfo {
  name?: string;
  description?: string;
  creationDate?: string;
  imageId: string;
}

export async function getAMI(amiId: string): Promise<AMIInfo | undefined> {
  const input: DescribeImagesCommandInput = { ImageIds: [amiId] };

  try {
    const command = new DescribeImagesCommand(input);
    const response = await ec2Client.send(command);
    const image = response.Images?.[0];

    if (!image) return undefined;

    return {
      name: image.Name,
      description: image.Description,
      creationDate: image.CreationDate,
      imageId: image.ImageId!,
    };
  } catch (error: unknown) {
    console.error(`Error describing AMI ${amiId}:`, error);
    return undefined;
  }
}

export async function copyAMI(
  sourceAmiId: string,
  sourceRegion: string,
  name: string,
  description: string
): Promise<string | undefined> {
    const copyCommand = new CopyImageCommand({
      SourceImageId: sourceAmiId,
      SourceRegion: sourceRegion,
      Name: name,
      Description: description,
    });

    const copyResult = await ec2Client.send(copyCommand);
    const newAmiId = copyResult.ImageId;

    if (!newAmiId) {
      throw new Error("Failed to initiate AMI copy");
    }

    console.log(`Copy started. Waiting for AMI ${newAmiId} to become available...`);

    const waitResult = await waitUntilImageAvailable(
      {
        client: ec2Client,
        maxWaitTime: 600, // seconds
        minDelay: 10,
        maxDelay: 30,
      },
      {
        ImageIds: [newAmiId],
      }
    );

    if (waitResult.state !== "SUCCESS") {
      throw new Error(`Timed out waiting for AMI ${newAmiId} to become available`);
    }

    console.log(`AMI ${newAmiId} is now available.`);
    return newAmiId;
}

export async function getSnapshotIdFromAMI(amiId: string): Promise<string[] | undefined> {
  try {
    const describeCommand = new DescribeImagesCommand({
      ImageIds: [amiId],
    });

    const response = await ec2Client.send(describeCommand);
    const image = response.Images?.[0];

    if (!image) {
      console.error("AMI not found");
      return undefined;
    }

    return image.BlockDeviceMappings
      ?.map((bdm) => bdm.Ebs?.SnapshotId)
      .filter((id): id is string => !!id);
  } catch (error) {
    console.error("Error fetching snapshot ID:", error);
    return undefined;
  }
}
import * as core from '@actions/core';
import { getParameter } from './services/ssmService.ts';
import { getAMI, copyAMI, getSnapshotIdFromAMI, deregisterAmi, deleteSnapshot} from './services/ec2Service.ts';

export async function run(): Promise<void> {
    try {
        const amiId : string = core.getInput('ami-id');
        const ssmParamAMIId : string = core.getInput('ssm-param-ami-id');
        const description : string = core.getInput('description');
        const region : string = core.getInput('region');

        let copyAMIId: string;

        const amiIdFromSSMParam = await getParameter(ssmParamAMIId);

        if (amiIdFromSSMParam) {
            copyAMIId = amiIdFromSSMParam;
        } else {
            copyAMIId = amiId;
        }

        const amiInfo = await getAMI(copyAMIId);

        if (!amiInfo) {
            core.setFailed(`Failed to get AMI info for ${copyAMIId}`);
            return;
        }

        if (!amiInfo.name) {
            core.setFailed(`AMI ${copyAMIId} has no name`);
            return;
        }

        const copiedAMIId = await copyAMI(amiInfo.imageId, region, amiInfo.name, description);

        if (!copiedAMIId) {
            core.setFailed(`Failed to copy AMI: ${amiInfo.imageId}`);
            return;
        }

        const snapshotIds = await getSnapshotIdFromAMI(copiedAMIId);

        if (!snapshotIds) {
            core.setFailed(`Failed to get snapshot IDs for AMI: ${copiedAMIId}`);
            return;
        }

        console.log(`Copied AMI: ${copiedAMIId}`);
        console.log(`Copied AMI Snapshot: ${snapshotIds[0]}`);

        core.setOutput('copied-ami-id', copiedAMIId);
        core.exportVariable('COPIED_AMI_ID', copiedAMIId);

        core.setOutput("copied-ami-snapshot-id", snapshotIds[0]);
        core.exportVariable("COPIED_AMI_SNAPSHOT_ID", snapshotIds[0]);
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed('An unexpected error occurred');
        }
    }
}

export async function cleanup(): Promise<void> {
    const amiId = process.env.COPIED_AMI_ID;
    const snapshotId = process.env.COPIED_AMI_SNAPSHOT_ID;

    if (amiId) {
        await deregisterAmi(amiId);
    }

    if (snapshotId) {
        await deleteSnapshot(snapshotId);
    }
}

import * as core from '@actions/core'
import { getParameter } from './services/ssmService.ts'
import { getAMI, copyAMI, getSnapshotIdFromAMI} from './services/ec2Service.ts'

export async function run(): Promise<void> {
    try {
        const amiId : string = core.getInput('ami-id')
        const ssmParamAMIId : string = core.getInput('ssm-param-ami-id')
        const description : string = core.getInput('description')
        const region : string = core.getInput('region')

        let copyAMIId: string;

        const amiIdFromSSMParam = await getParameter(ssmParamAMIId);

        if (amiIdFromSSMParam) {
            copyAMIId = amiIdFromSSMParam;
        } else {
            copyAMIId = amiId;
        }

        const amiInfo = await getAMI(copyAMIId);

        if (!amiInfo) {
            core.setFailed(`Failed to get AMI info for ${copyAMIId}`)
            return
        }

        if (!amiInfo.name) {
            core.setFailed(`AMI ${copyAMIId} has no name`)
            return
        }

        const copiedAMIId = await copyAMI(amiInfo.imageId, region, amiInfo.name, description)

        if (!copiedAMIId) {
            core.setFailed(`Failed to copy AMI: ${amiInfo.imageId}`)
            return
        }

        const snapshotIds = getSnapshotIdFromAMI(copiedAMIId)

        if (!snapshotIds) {
            core.setFailed(`Failed to get snapshot IDs for AMI: ${copiedAMIId}`)
            return
        }

        const firstSnapshotId = snapshotIds?.[0];

        core.setOutput('copied-ami-id', copiedAMIId)
        core.exportVariable('COPIED_AMI_ID', copiedAMIId)

        core.setOutput("copied-ami-snapshot-id", snapshotId)
        core.exportVariable("COPIED_AMI_SNAPSHOT_ID", snapshots[0])

        console.log(`Copying AMI ${copyAMIId} to ${region} region`);
        console.log(`Description: ${description}`);
    } catch (error) {

    }
}


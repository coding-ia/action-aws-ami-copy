import {
  SSMClient,
  GetParameterCommand,
  GetParameterCommandInput,
} from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient();

export async function getParameter(name: string): Promise<string | undefined> {
  const input: GetParameterCommandInput = {
    Name: name,
    WithDecryption: true,
  };

  try {
    const command = new GetParameterCommand(input);
    const response = await ssmClient.send(command);
    return response.Parameter?.Value;
  } catch (error) {
    console.error('Error fetching parameter:', error);
    return undefined;
  }
}

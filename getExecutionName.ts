import { promisify } from "util";
import { StepFunctions } from "aws-sdk";

const domain = process.env.DOMAIN;
const waitTime = Number(process.env.WAIT_TIME);
// reuse the state machine arn and replace stateMachine by execution
// is there a better way ?
const exeutionArnBasePath = process.env.STATE_MACHINE_ARN?.replace(":stateMachine:", ":execution:");

interface GetNameEvent {
  pathParameters: { executionId: string };
}

const stepFunctions = new StepFunctions();

const getExecutionHistory: (
  params: AWS.StepFunctions.Types.GetExecutionHistoryInput
) => Promise<AWS.StepFunctions.Types.GetExecutionHistoryOutput> = promisify(
  stepFunctions.getExecutionHistory.bind(stepFunctions)
);

const wait = (timeout: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, timeout));
const retry = async <T>(fn: () => Promise<T>, times = 3): Promise<T> => {
  if (times === 0) throw new Error("Can't retry to run this function");
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    await wait(300);
    return retry(fn, times - 1);
  }
};

export const getExecutionName = async (event: GetNameEvent): Promise<any> => {
  console.log(event);
  if (!event.pathParameters.executionId) throw new Error("Please provide an execution ARN");
  const run = async (): Promise<{ name: string; expiryDate: Date }> => {
    const data = await getExecutionHistory({
      executionArn: `${exeutionArnBasePath}:${event.pathParameters.executionId}`,
    });
    if (data.events) {
      const event = data.events.find(
        (event: any) =>
          event.type === "LambdaFunctionSucceeded" &&
          JSON.parse(event?.lambdaFunctionSucceededEventDetails?.output ?? "")?.name
      );
      if (event) {
        const date = new Date(event.timestamp);
        date.setSeconds(date.getSeconds() + waitTime);
        return {
          name: JSON.parse(event?.lambdaFunctionSucceededEventDetails?.output ?? "")?.name,
          expiryDate: date,
        };
      }
    }
    throw new Error("Unable to find the event");
  };

  try {
    const { name, expiryDate } = await retry(run, 10);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: `${name}.${domain}`, expiryDate }),
    };
  } catch (e) {
    return {
      statusCode: 404,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    };
  }
};

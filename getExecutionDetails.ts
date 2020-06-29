import { StepFunctions } from "aws-sdk";
import { retry } from "./retry";

const domain = process.env.DOMAIN;
const recordExpiryTime = Number(process.env.RECORD_EXPIRY_TIME);
// reuse the state machine arn and replace stateMachine by execution
// is there a better way ?
const executionArnBasePath = process.env.STATE_MACHINE_ARN?.replace(":stateMachine:", ":execution:");

interface GetNameEvent {
  pathParameters: { executionId: string };
}

const stepFunctions = new StepFunctions();

// this function will run through all the events generated by the step machine and will try to find
// - a lambda
// - which provides a name variable as an output.
// From this we will assume that the returned event if any is the expected one
// From the event, we will return
// - the name
// - the expiry time thanks to the execution timestamp and the RECORD_EXPIRY_TIME set
const retrieveExecutionDetailsFromExecutionId = (executionId: string) => async (): Promise<{
  name: string;
  expiryDate: Date;
}> => {
  const data = await stepFunctions
    .getExecutionHistory({
      executionArn: `${executionArnBasePath}:${executionId}`,
    })
    .promise();
  if (data.events) {
    // find the corresponding event
    const event = data.events.find(
      (event: AWS.StepFunctions.Types.HistoryEvent) =>
        event.type === "LambdaFunctionSucceeded" &&
        JSON.parse(event?.lambdaFunctionSucceededEventDetails?.output ?? "")?.name
    );
    // we found an event ? ok let's return the data
    if (event) {
      const date = new Date(event.timestamp);
      date.setSeconds(date.getSeconds() + recordExpiryTime);
      return {
        name: JSON.parse(event?.lambdaFunctionSucceededEventDetails?.output ?? "")?.name,
        expiryDate: date,
      };
    }
  }
  throw new Error("Unable to find the event");
};

export const getExecutionDetails = async (
  event: GetNameEvent
): Promise<{ statusCode: number; headers: { [key: string]: any }; body?: string }> => {
  console.log(event);
  if (!event.pathParameters.executionId) throw new Error("Please provide an execution ARN");

  try {
    // as the execution is asynchronous, we will retry multiple time until we get a result.
    const { name, expiryDate } = await retry(
      retrieveExecutionDetailsFromExecutionId(event.pathParameters.executionId),
      { times: 10 }
    );
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

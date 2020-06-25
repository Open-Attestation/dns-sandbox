// only use the type :)
// eslint-disable-next-line import/no-unresolved
import { Context, Callback } from "aws-lambda";
import { Route53 } from "aws-sdk";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";
import { getExecutionName } from "./getExecutionName";

const domain = process.env.DOMAIN;
const hostedZoneId = process.env.HOSTED_ZONE_ID || "";
const route53 = new Route53();

interface CreateEvent {
  address: string;
  networkId: number;
}

interface CleanEvent {
  address: string;
  networkId: number;
  name: string;
}

const createRecord = ({
  action,
  address,
  name,
  networkId,
}: {
  address: string;
  networkId: number;
  name: string;
  action: string;
}): Route53.Types.ChangeResourceRecordSetsRequest => {
  return {
    ChangeBatch: {
      Changes: [
        {
          Action: action,
          ResourceRecordSet: {
            Name: `${name}.${domain}`,
            ResourceRecords: [
              {
                Value: `"openatts net=ethereum netId=${networkId} addr=${address}"`,
              },
            ],
            TTL: 60,
            Type: "TXT",
          },
        },
      ],
    },
    HostedZoneId: hostedZoneId,
  };
};

module.exports = {
  create: (event: CreateEvent, context: Context, callback: Callback<CleanEvent>) => {
    console.log(event);

    if (!event.address) throw new Error("Please provide an address");
    if (!event.networkId || !isFinite(event.networkId)) throw new Error("Please provide a networkId that is a number");
    const name = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals], separator: "-" });

    route53.changeResourceRecordSets(createRecord({ action: "CREATE", ...event, name }), (err) => {
      callback(err, { name, ...event });
    });
  },
  clean: (event: CleanEvent, context: Context, callback: Callback<CleanEvent>) => {
    console.log(event);
    if (!event.address) throw new Error("Please provide an address");
    if (!event.networkId || !isFinite(event.networkId)) throw new Error("Please provide a networkId that is a number");
    if (!event.name) throw new Error("Please provide a name");
    route53.changeResourceRecordSets(createRecord({ action: "DELETE", ...event }), (err) => {
      callback(err, event);
    });
  },
  getExecutionName,
};

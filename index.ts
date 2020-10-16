// only use the type :)
// eslint-disable-next-line import/no-unresolved
import { Context, Callback } from "aws-lambda";
import { Route53 } from "aws-sdk";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";

const domain = process.env.DOMAIN;
const hostedZoneId = process.env.HOSTED_ZONE_ID || "";
const route53 = new Route53();

interface DocumentStoreEvent {
  address: string;
  networkId: number;
}
interface PublicKeyEvent {
  algorithm: string;
  publicKey: string;
}
type CreateEvent = Partial<DocumentStoreEvent> & Partial<PublicKeyEvent>;

type CleanEvent = Partial<DocumentStoreEvent> &
  Partial<PublicKeyEvent> & {
    name: string;
  };

const createRecord = ({
  action,
  name,
  value,
}: {
  name: string;
  action: string;
  value: string;
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
                Value: value,
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

//
const isEthereumAddressEvent = (event: CreateEvent): event is DocumentStoreEvent =>
  !!event.address && !!event.networkId && isFinite(event.networkId);
const createEthereumAddressRecord = ({ networkId, address }: DocumentStoreEvent): string =>
  `"openatts net=ethereum netId=${networkId} addr=${address}"`;

const isPublicKeyEvent = (event: CreateEvent): event is PublicKeyEvent => !!event.algorithm && !!event.publicKey;
const createPublicKeyRecord = ({ algorithm, publicKey }: PublicKeyEvent): string =>
  `"openatts a=${algorithm}; p=${publicKey}; v=1.0;"`;

export const create = (event: CreateEvent, context: Context, callback: Callback<CleanEvent>): void => {
  console.log(event);

  let value = "";
  if (isEthereumAddressEvent(event)) value = createEthereumAddressRecord({ ...event });
  else if (isPublicKeyEvent(event)) value = createPublicKeyRecord({ ...event });
  else
    throw new Error(
      "Please provide information for document store (networkId and address) or information for publicKey (algorithm and publicKey)"
    );
  const name = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals], separator: "-" });

  route53.changeResourceRecordSets(createRecord({ action: "CREATE", value, name }), (err) => {
    callback(err, { name, ...event });
  });
};

export const clean = (event: CleanEvent, context: Context, callback: Callback<CleanEvent>): void => {
  console.log(event);
  let value = "";
  if (isEthereumAddressEvent(event)) value = createEthereumAddressRecord({ ...event });
  else if (isPublicKeyEvent(event)) value = createPublicKeyRecord({ ...event });
  else
    throw new Error(
      "Please provide information for document store (networkId and address) or information for publicKey (algorithm and publicKey)"
    );
  if (!event.name) throw new Error("Please provide a name");
  route53.changeResourceRecordSets(createRecord({ action: "DELETE", value, name: event.name }), (err) => {
    callback(err, event);
  });
};

export { getExecutionDetails } from "./getExecutionDetails";

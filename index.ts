// only use the type :)
// eslint-disable-next-line import/no-unresolved
import { Context, Callback } from "aws-lambda";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";

interface Event {
  documentStore: string;
  network: string;
}
module.exports = {
  create: (event: Event, context: Context, cb: Callback) => {
    console.log("hello :)");
    console.log(event);
    cb(null, { name: uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] }), status: "RECORD CREATED" });
  },
  clean: (event: Event, context: Context, cb: Callback) => {
    console.log("clean :)");
    console.log(event);
    return cb(null, { status: "DONE" });
  },
};

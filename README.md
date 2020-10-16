## Test

1. export DOMAIN=sandbox.openattestation.com
1. export HOSTED_ZONE_ID=<hosted_zone_id>
1. export AWS_ACCESS_KEY_ID=<access_key>
1. export AWS_SECRET_ACCESS_KEY=<secret_key>
1. npx serverless deploy
1. retrieve url from deployment
1. E2E_URL=<deployed_url> npm run test:watch

> By default, this deployment will replace the `stg` environment.

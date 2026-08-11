const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';

const clientConfig = {
    region
};

// Only override credentials explicitly if NOT running in AWS Lambda environment
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        clientConfig.credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        };
    }

    // Support local DynamoDB endpoint if running locally
    if (process.env.DYNAMODB_ENDPOINT) {
        clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
        if (!clientConfig.credentials) {
            clientConfig.credentials = {
                accessKeyId: 'fakeAccessKeyId',
                secretAccessKey: 'fakeSecretAccessKey'
            };
        }
    }
}

const client = new DynamoDBClient(clientConfig);

const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true
    },
    unmarshallOptions: {
        wrapNumbers: false
    }
});

module.exports = docClient;

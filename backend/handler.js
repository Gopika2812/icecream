const serverless = require('serverless-http');
const app = require('./app');

const lambdaHandler = serverless(app);

module.exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    return lambdaHandler(event, context);
};


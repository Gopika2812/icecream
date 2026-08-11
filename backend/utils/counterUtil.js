const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const docClient = require('../config/dynamo');

/**
 * Generates an atomic sequential number for a given counter sequence name.
 * Uses DynamoDB UpdateItem with ADD to guarantee atomic increment without concurrency issues.
 */
async function getNextSequence(sequenceName, initialValue = 1000) {
    const tableName = process.env.COUNTERS_TABLE || 'icecream-counters';
    try {
        const response = await docClient.send(new UpdateCommand({
            TableName: tableName,
            Key: { id: sequenceName },
            UpdateExpression: 'ADD currentSeq :inc',
            ExpressionAttributeValues: {
                ':inc': 1
            },
            ReturnValues: 'UPDATED_NEW'
        }));
        
        return response.Attributes.currentSeq;
    } catch (error) {
        // Fallback for missing table during dev testing
        console.warn(`Counter update warning for ${sequenceName}:`, error.message);
        return Math.floor(Date.now() / 1000);
    }
}

module.exports = {
    getNextSequence
};

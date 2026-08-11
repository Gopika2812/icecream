const { 
    PutCommand, 
    GetCommand, 
    ScanCommand, 
    DeleteCommand, 
    UpdateCommand
} = require('@aws-sdk/lib-dynamodb');
const docClient = require('../config/dynamo');
const { randomUUID } = require('crypto');

class DynamoModel {
    constructor(tableNameEnvKey, defaultTableName) {
        this.tableNameEnvKey = tableNameEnvKey;
        this.defaultTableName = defaultTableName;
    }

    get tableName() {
        return process.env[this.tableNameEnvKey] || this.defaultTableName;
    }

    _formatDoc(item) {
        if (!item) return null;
        const formatted = { ...item };
        if (formatted.id && !formatted._id) {
            formatted._id = formatted.id;
        } else if (formatted._id && !formatted.id) {
            formatted.id = formatted._id;
        }
        Object.defineProperty(formatted, 'populate', {
            value: function () { return formatted; },
            writable: true,
            configurable: true,
            enumerable: false
        });
        return formatted;
    }

    async findById(id) {
        if (!id) return null;
        const targetId = typeof id === 'object' && id._id ? id._id.toString() : id.toString();
        try {
            const result = await docClient.send(new GetCommand({
                TableName: this.tableName,
                Key: { id: targetId }
            }));
            return this._formatDoc(result.Item);
        } catch (error) {
            console.error(`Error in findById on ${this.tableName}:`, error);
            return null;
        }
    }

    async findOne(query = {}) {
        const results = await this._executeScan(query);
        return results.length > 0 ? results[0] : null;
    }

    find(query = {}) {
        return new QueryResultQuery(this, query);
    }

    async _executeScan(query = {}) {
        try {
            const scanResult = await docClient.send(new ScanCommand({
                TableName: this.tableName
            }));
            let items = (scanResult.Items || []).map(item => this._formatDoc(item));

            // Apply filter criteria
            if (Object.keys(query).length > 0) {
                items = items.filter(item => {
                    for (const [key, val] of Object.entries(query)) {
                        if (val === undefined || val === null) continue;
                        
                        // Handle date range object filter {$gte, $lte}
                        if (typeof val === 'object' && (val.$gte || val.$lte)) {
                            const itemDate = new Date(item[key]);
                            if (val.$gte && itemDate < new Date(val.$gte)) return false;
                            if (val.$lte && itemDate > new Date(val.$lte)) return false;
                            continue;
                        }

                        // Handle ObjectId string comparison or direct equality
                        const itemVal = item[key]?._id ? item[key]._id.toString() : item[key]?.toString();
                        const queryVal = val?._id ? val._id.toString() : val?.toString();
                        
                        if (itemVal !== queryVal) {
                            return false;
                        }
                    }
                    return true;
                });
            }

            return items;
        } catch (error) {
            console.error(`Error in scan on ${this.tableName}:`, error);
            return [];
        }
    }

    async create(docData) {
        const id = docData.id || docData._id || randomUUID();
        const now = new Date().toISOString();
        const item = {
            ...docData,
            id: id.toString(),
            _id: id.toString(),
            createdAt: docData.createdAt || now,
            updatedAt: now
        };

        await docClient.send(new PutCommand({
            TableName: this.tableName,
            Item: item
        }));

        return this._formatDoc(item);
    }

    async findByIdAndUpdate(id, updates = {}, options = { new: true }) {
        const targetId = typeof id === 'object' && id._id ? id._id.toString() : id.toString();
        const existing = await this.findById(targetId);
        if (!existing) return null;

        const updatedDoc = {
            ...existing,
            ...updates,
            id: targetId,
            _id: targetId,
            updatedAt: new Date().toISOString()
        };

        await docClient.send(new PutCommand({
            TableName: this.tableName,
            Item: updatedDoc
        }));

        return this._formatDoc(updatedDoc);
    }

    async findByIdAndDelete(id) {
        const targetId = typeof id === 'object' && id._id ? id._id.toString() : id.toString();
        const existing = await this.findById(targetId);
        if (!existing) return null;

        await docClient.send(new DeleteCommand({
            TableName: this.tableName,
            Key: { id: targetId }
        }));

        return existing;
    }

    async countDocuments(query = {}) {
        const items = await this._executeScan(query);
        return items.length;
    }

    async deleteMany(query = {}) {
        const items = await this._executeScan(query);
        for (const item of items) {
            await this.findByIdAndDelete(item.id);
        }
        return { deletedCount: items.length };
    }

    async insertMany(docs = []) {
        const created = [];
        for (const doc of docs) {
            const item = await this.create(doc);
            created.push(item);
        }
        return created;
    }
}

class QueryResultQuery {
    constructor(model, query) {
        this.model = model;
        this.query = query;
        this._sortObj = null;
        this._limitVal = null;
    }

    populate(pathSpec, fields) {
        return this;
    }

    sort(sortObjOrFn) {
        this._sortObj = sortObjOrFn;
        return this;
    }

    limit(n) {
        this._limitVal = n;
        return this;
    }

    lean() {
        return this;
    }

    async then(onFulfilled, onRejected) {
        try {
            let items = await this.model._executeScan(this.query);

            if (this._sortObj) {
                let field = 'createdAt';
                let direction = -1;

                if (typeof this._sortObj === 'object' && this._sortObj !== null) {
                    const keys = Object.keys(this._sortObj);
                    if (keys.length > 0) {
                        field = keys[0];
                        direction = this._sortObj[field] === -1 || this._sortObj[field] === 'desc' ? -1 : 1;
                    }
                } else if (typeof this._sortObj === 'string') {
                    if (this._sortObj.startsWith('-')) {
                        field = this._sortObj.substring(1);
                        direction = -1;
                    } else {
                        field = this._sortObj;
                        direction = 1;
                    }
                }

                items.sort((a, b) => {
                    const valA = a[field] ? new Date(a[field]).getTime() || a[field] : 0;
                    const valB = b[field] ? new Date(b[field]).getTime() || b[field] : 0;
                    if (valA < valB) return -1 * direction;
                    if (valA > valB) return 1 * direction;
                    return 0;
                });
            }

            if (this._limitVal) {
                items = items.slice(0, this._limitVal);
            }

            return onFulfilled ? onFulfilled(items) : items;
        } catch (err) {
            if (onRejected) return onRejected(err);
            throw err;
        }
    }
}

module.exports = DynamoModel;

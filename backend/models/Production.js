const DynamoModel = require('./DynamoModel');

class ProductionModel extends DynamoModel {
    constructor() {
        super('PRODUCTION_TABLE', 'icecream-erp-backend-production-dev');
    }
}

module.exports = new ProductionModel();

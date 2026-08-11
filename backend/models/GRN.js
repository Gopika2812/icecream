const DynamoModel = require('./DynamoModel');

class GRNModel extends DynamoModel {
    constructor() {
        super('GRN_TABLE', 'icecream-erp-backend-grn-dev');
    }
}

module.exports = new GRNModel();

const DynamoModel = require('./DynamoModel');

class CustomerReceiptModel extends DynamoModel {
    constructor() {
        super('CUSTOMER_RECEIPTS_TABLE', 'icecream-erp-backend-customer-receipts-dev');
    }
}

module.exports = new CustomerReceiptModel();

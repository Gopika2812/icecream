const DynamoModel = require('./DynamoModel');

class CustomerModel extends DynamoModel {
    constructor() {
        super('CUSTOMERS_TABLE', 'icecream-erp-backend-customers-dev');
    }
}

module.exports = new CustomerModel();

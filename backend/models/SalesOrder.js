const DynamoModel = require('./DynamoModel');

class SalesOrderModel extends DynamoModel {
    constructor() {
        super('SALES_ORDERS_TABLE', 'icecream-erp-backend-sales-orders-dev');
    }
}

module.exports = new SalesOrderModel();

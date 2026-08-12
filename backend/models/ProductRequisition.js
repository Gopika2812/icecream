const DynamoModel = require('./DynamoModel');

class ProductRequisitionModel extends DynamoModel {
    constructor() {
        super('PURCHASE_ORDERS_TABLE', 'icecream-erp-backend-purchase-orders-dev');
    }
}

module.exports = new ProductRequisitionModel();

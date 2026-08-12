const DynamoModel = require('./DynamoModel');

class ProductRequisitionModel extends DynamoModel {
    constructor() {
        super('PRODUCT_REQUISITION_TABLE', 'icecream-erp-backend-product-requisition-dev');
    }
}

module.exports = new ProductRequisitionModel();

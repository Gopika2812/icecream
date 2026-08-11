const DynamoModel = require('./DynamoModel');

class ProductModel extends DynamoModel {
    constructor() {
        super('PRODUCTS_TABLE', 'icecream-erp-backend-products-dev');
    }
}

module.exports = new ProductModel();

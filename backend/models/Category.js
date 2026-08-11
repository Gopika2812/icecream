const DynamoModel = require('./DynamoModel');

class CategoryModel extends DynamoModel {
    constructor() {
        super('CATEGORIES_TABLE', 'icecream-erp-backend-categories-dev');
    }
}

module.exports = new CategoryModel();

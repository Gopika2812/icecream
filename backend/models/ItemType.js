const DynamoModel = require('./DynamoModel');

class ItemTypeModel extends DynamoModel {
    constructor() {
        super('ITEM_TYPES_TABLE', 'icecream-erp-backend-item-types-dev');
    }
}

module.exports = new ItemTypeModel();

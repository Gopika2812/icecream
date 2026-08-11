const DynamoModel = require('./DynamoModel');

class QualityControlModel extends DynamoModel {
    constructor() {
        super('QUALITY_CONTROL_TABLE', 'icecream-erp-backend-quality-control-dev');
    }
}

module.exports = new QualityControlModel();

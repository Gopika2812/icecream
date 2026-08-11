const DynamoModel = require('./DynamoModel');

class BranchModel extends DynamoModel {
    constructor() {
        super('BRANCHES_TABLE', 'icecream-erp-backend-branches-dev');
    }
}

module.exports = new BranchModel();

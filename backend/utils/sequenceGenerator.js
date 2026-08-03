const getFinancialYearCode = (date = new Date()) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed: 0=Jan, 3=Apr
    let startYear = year;
    if (month < 3) {
        startYear = year - 1;
    }
    const endYear = startYear + 1;
    const startStr = startYear.toString().slice(-2);
    const endStr = endYear.toString().slice(-2);
    return `${startStr}-${endStr}`;
};

const getNextSequenceNumber = async (Model, fieldName, prefix, date = new Date()) => {
    const fy = getFinancialYearCode(date);
    const regex = new RegExp(`^${prefix}-\\d+\\/${fy}$`, 'i');

    const records = await Model.find({ [fieldName]: regex }).lean();
    let maxSeq = 0;

    records.forEach(doc => {
        const val = doc[fieldName] || '';
        const match = val.match(new RegExp(`${prefix}-(\\d+)\\/${fy}`, 'i'));
        if (match) {
            const seqNum = parseInt(match[1], 10);
            if (seqNum > maxSeq) maxSeq = seqNum;
        }
    });

    if (maxSeq === 0) {
        const totalCount = await Model.countDocuments();
        maxSeq = totalCount;
    }

    const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
    return `${prefix}-${nextSeq}/${fy}`;
};

module.exports = {
    getFinancialYearCode,
    getNextSequenceNumber
};
